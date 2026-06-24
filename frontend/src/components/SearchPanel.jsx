import { useState, useEffect, useRef } from 'react';
import SpotlightCard from './SpotlightCard.jsx';
import BorderGlow from './BorderGlow.jsx';
import Counter from './Counter.jsx';
import { searchPlayers, predictPlayer } from '../api/client.js';
import './SearchPanel.css';

export default function SearchPanel({ sessionId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(query);
        setResults(players);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handlePredict = async (player) => {
    setSelected(player);
    setPredicting(true);
    setError(null);
    try {
      // search results only give summary stats — backend predict needs full attribute set,
      // so we estimate remaining attributes from overall rating as a reasonable baseline
      const baseline = player.overall - 5;
      const payload = {
        player_name: player.name,
        age: player.age,
        overall: player.overall,
        potential: player.overall + 3,
        wage: player.value * 1000,
        position: player.position,
        reputation: 2,
        weakfoot: 3,
        skillmoves: 3,
        crossing: baseline, finishing: baseline, heading: baseline, passing: baseline,
        dribbling: baseline, ballcontrol: baseline, acceleration: baseline, sprintspeed: baseline,
        reactions: baseline, shotpower: baseline, stamina: baseline, strength: baseline, vision: baseline,
      };
      const data = await predictPlayer(payload, sessionId);
      setSelected({ ...player, prediction: data });
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not predict this player.');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="search-panel">
      <div className="search-input-wrap">
        <input
          className="search-input"
          type="text"
          placeholder="Search any player by name…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        {query.length > 0 && (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => { setQuery(''); setResults([]); }}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {searching && <p className="muted-text">Searching…</p>}

      {results.length > 0 && (
        <div className="search-results-grid">
          {results.map(p => (
            <SpotlightCard
              key={p.name}
              className="search-result-card"
              spotlightColor="rgba(0, 255, 135, 0.15)"
            >
              <div onClick={() => handlePredict(p)} className="search-result-inner">
                <div className="search-result-name">{p.name}</div>
                <div className="search-result-meta">
                  {p.position} · OVR {p.overall} · Age {p.age}
                </div>
                <div className="search-result-club">{p.club}</div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="muted-text">No players found for "{query}".</p>
      )}

      {error && <div className="error-banner">{error}</div>}
      {predicting && <div className="loading-banner">Calculating prediction…</div>}

      {selected?.prediction && (
        <BorderGlow
          className="result-glow"
          colors={['#00ff87', '#00cc6a', '#00ff87']}
          backgroundColor="#0d1117"
          borderRadius={18}
        >
          <div className="result-content">
            <div className="result-label">{selected.name} — Predicted Value</div>
            <div className="result-value">
              <span className="result-currency">€</span>
              <Counter value={selected.prediction.value_m} fontSize={48} gradientHeight={6} />
              <span className="result-suffix">M</span>
            </div>
            <div className={`result-category cat-${selected.prediction.category?.toLowerCase()}`}>
              {selected.prediction.category} Tier
            </div>
            <p className="estimate-note">
              Note: detailed attributes estimated from overall rating since search results
              don't include full stat breakdowns. For precise predictions, use Custom Player builder.
            </p>
          </div>
        </BorderGlow>
      )}
    </div>
  );
}