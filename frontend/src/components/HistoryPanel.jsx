import { useState, useEffect, useCallback } from 'react';
import AnimatedList from './AnimatedList.jsx';
import GlassIcons from './GlassIcons.jsx';
import { getHistory, deleteHistoryItem, clearHistory } from '../api/client.js';
import './HistoryPanel.css';

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
  </svg>
);

const ClearAllIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 6 5 18M5 6l14 12" />
  </svg>
);

const CAT_COLORS = { Low: '#888', Medium: '#4dd2ff', High: '#00ff87', Elite: '#ffd24d' };

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoryPanel({ sessionId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(() => {
    setLoading(true);
    getHistory(sessionId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    try {
      await deleteHistoryItem(id);
    } catch {
      loadHistory();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all prediction history? This cannot be undone.')) return;
    setHistory([]);
    try {
      await clearHistory(sessionId);
    } catch {
      loadHistory();
    }
  };

  if (loading) {
    return <p className="muted-text">Loading history…</p>;
  }

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <p className="muted-text">No predictions yet. Run one from the Predict tab to see it here.</p>
      </div>
    );
  }

  const listItems = history.map(h => (
    <div key={h.id} className="history-item-row">
      <div className="history-item-main">
        <div className="history-item-name">{h.player_name}</div>
        <div className="history-item-meta">
          {h.position} · OVR {h.overall} · Age {h.age} · {formatDate(h.created_at)}
        </div>
      </div>
      <div className="history-item-right">
        <div className="history-item-value">€{h.predicted_value}M</div>
        <div
          className="history-item-tier"
          style={{ color: CAT_COLORS[h.category] || '#fff' }}
        >
          {h.category}
        </div>
        <div onClick={e => e.stopPropagation()}>
          <GlassIcons
            className="history-delete-icon"
            items={[
              {
                icon: <TrashIcon />,
                color: 'red',
                label: 'Delete',
                customClass: 'icon-btn--small',
                onClick: () => handleDelete(h.id),
              },
            ]}
          />
        </div>
      </div>
    </div>
  ));

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3 className="history-title">Prediction History</h3>
        <button className="clear-all-btn" onClick={handleClearAll}>
          <ClearAllIcon /> Clear All
        </button>
      </div>

      <AnimatedList
        items={listItems}
        showGradients={true}
        enableArrowNavigation={true}
        displayScrollbar={true}
      />
    </div>
  );
}