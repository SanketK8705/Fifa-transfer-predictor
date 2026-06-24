import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend, ResponsiveContainer, Cell
} from 'recharts';
import FlowingMenu from './FlowingMenu.jsx';
import SpotlightCard from './SpotlightCard.jsx';
import { getAnalysisData, getScores } from '../api/client.js';
import './AnalysisPanel.css';

const CAT_COLORS = { Low: '#888', Medium: '#4dd2ff', High: '#00ff87', Elite: '#ffd24d' };

const SUB_TABS = [
  { text: 'PCA', link: '#pca' },
  { text: 'Classification', link: '#classification' },
  { text: 'Regression', link: '#regression' },
];

export default function AnalysisPanel() {
  const [activeSub, setActiveSub] = useState('PCA');
  const [analysis, setAnalysis] = useState(null);
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAnalysisData(), getScores()])
      .then(([a, s]) => {
        setAnalysis(a);
        setScores(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const menuItems = SUB_TABS.map(t => ({
    ...t,
    onClick: () => setActiveSub(t.text),
  }));

  if (loading) {
    return <p className="muted-text">Loading model analysis…</p>;
  }

  if (!analysis || !scores) {
    return <p className="muted-text">Analysis data unavailable.</p>;
  }

  const pcaScatterData = Object.entries(analysis.pca_scatter || {}).flatMap(([cat, pts]) =>
    pts.x.map((x, i) => ({ x, y: pts.y[i], category: cat }))
  );

  const regressionBarData = ['lr', 'rf', 'gb'].map(key => ({
    name: key === 'lr' ? 'Linear Reg.' : key === 'rf' ? 'Random Forest' : 'Gradient Boost',
    r2: scores.reg_scores[key]?.r2 ?? 0,
    mae: scores.reg_scores[key]?.mae ?? 0,
  }));

  const classificationBarData = ['lr', 'rf', 'gb'].map(key => ({
    name: key === 'lr' ? 'Logistic Reg.' : key === 'rf' ? 'Random Forest' : 'Gradient Boost',
    accuracy: analysis.clf_scores[key]?.accuracy ?? 0,
    kappa: (analysis.clf_scores[key]?.kappa ?? 0) * 100,
  }));

  return (
    <div className="analysis-panel">
      <div className="sub-nav-wrap">
        <FlowingMenu items={menuItems} />
      </div>

      {activeSub === 'PCA' && (
        <div className="analysis-section">
          <div className="pca-stats-row">
            <SpotlightCard className="stat-mini-card" spotlightColor="rgba(0,255,135,0.12)">
              <div className="stat-mini-label">Components</div>
              <div className="stat-mini-value">{analysis.pca_stats.n_components}</div>
            </SpotlightCard>
            <SpotlightCard className="stat-mini-card" spotlightColor="rgba(0,255,135,0.12)">
              <div className="stat-mini-label">Original Features</div>
              <div className="stat-mini-value">{analysis.pca_stats.total_features}</div>
            </SpotlightCard>
            <SpotlightCard className="stat-mini-card" spotlightColor="rgba(0,255,135,0.12)">
              <div className="stat-mini-label">Variance Explained</div>
              <div className="stat-mini-value">{analysis.pca_stats.variance_explained}%</div>
            </SpotlightCard>
          </div>

          <div className="chart-card">
            <div className="chart-title">PCA 2D Projection by Value Tier</div>
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" dataKey="x" name="PC1" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="PC2" stroke="#888" tick={{ fontSize: 11 }} />
                <ZAxis range={[20, 20]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.keys(CAT_COLORS).map(cat => (
                  <Scatter
                    key={cat}
                    name={cat}
                    data={pcaScatterData.filter(d => d.category === cat)}
                    fill={CAT_COLORS[cat]}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeSub === 'Classification' && (
        <div className="analysis-section">
          <div className="chart-card">
            <div className="chart-title">Model Accuracy & Cohen's Kappa</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={classificationBarData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#00ff87" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
                <Bar dataKey="kappa" name="Kappa ×100" fill="#4dd2ff" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <div className="chart-title">Confusion Matrix (Random Forest)</div>
            <div className="confusion-grid" style={{ gridTemplateColumns: `repeat(${analysis.cm_labels.length}, 1fr)` }}>
              {analysis.cm_labels.map(label => (
                <div key={`h-${label}`} className="cm-header">{label}</div>
              ))}
              {analysis.confusion_matrix.flat().map((val, i) => {
                const max = Math.max(...analysis.confusion_matrix.flat());
                const intensity = max > 0 ? val / max : 0;
                return (
                  <div
                    key={i}
                    className="cm-cell"
                    style={{ background: `rgba(0, 255, 135, ${0.1 + intensity * 0.5})` }}
                  >
                    {val}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSub === 'Regression' && (
        <div className="analysis-section">
          <div className="chart-card">
            <div className="chart-title">R² Score & Mean Absolute Error (€M)</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={regressionBarData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="r2" name="R² %" fill="#00ff87" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
                <Bar dataKey="mae" name="MAE (€M)" fill="#ff8080" radius={[4, 4, 0, 0]} animationDuration={600} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}