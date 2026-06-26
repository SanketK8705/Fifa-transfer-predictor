import { useState, useEffect, useRef } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import SpotlightCard from './SpotlightCard.jsx';
import BorderGlow from './BorderGlow.jsx';
import { predictPlayer, getFamousPlayers, getPositions, searchPlayers } from '../api/client.js';
import './ComparePanel.css';

const RADAR_STATS = [
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'passing', label: 'Short Pass' },
  { key: 'ballcontrol', label: 'Ball Ctrl' },
  { key: 'acceleration', label: 'Accel' },
  { key: 'sprintspeed', label: 'Sprint' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'shotpower', label: 'Shot Pwr' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'strength', label: 'Strength' },
  { key: 'vision', label: 'Vision' },
  { key: 'crossing', label: 'Crossing' },
];

const TABLE_STATS = [
  { key: 'overall', label: 'Overall' },
  { key: 'potential', label: 'Potential' },
  { key: 'age', label: 'Age', lowerWins: true },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'passing', label: 'Short Passing' },
  { key: 'ballcontrol', label: 'Ball Control' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'sprintspeed', label: 'Sprint Speed' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'shotpower', label: 'Shot Power' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'strength', label: 'Strength' },
  { key: 'vision', label: 'Vision' },
  { key: 'crossing', label: 'Crossing' },
];

const DEFAULT_CUSTOM = {
  player_name: '', age: 25, overall: 75, potential: 80, wage: 50000,
  position: '', reputation: 2, weakfoot: 3, skillmoves: 3,
  crossing: 65, finishing: 65, heading: 65, passing: 65,
  dribbling: 65, ballcontrol: 65, acceleration: 65, sprintspeed: 65,
  reactions: 65, shotpower: 65, stamina: 65, strength: 65, vision: 65,
};

function PlayerPicker({ label, color, famousPlayers, positions, onConfirm }) {
  const [mode, setMode] = useState('famous');
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const players = await searchPlayers(search);
        setSearchResults(players);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  // players shown in list: live results if searching, else famous players
  const displayPlayers = search.trim().length >= 2 ? searchResults : (famousPlayers || []);

  const setField = (k, v) => setCustom(prev => ({ ...prev, [k]: v }));

  const handleConfirm = () => {
    if (mode === 'famous' && selected) onConfirm(selected);
    if (mode === 'custom') onConfirm({ ...custom, player_name: custom.player_name || 'Custom Player' });
  };

  return (
    <div className="player-picker" style={{ '--picker-color': color }}>
      <div className="picker-label" style={{ color }}>{label}</div>
      <div className="picker-mode-toggle">
        <button className={mode === 'famous' ? 'active' : ''} onClick={() => setMode('famous')}>Search</button>
        <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>Custom</button>
      </div>

      {mode === 'famous' && (
        <>
          <div style={{ position: 'relative' }}>
            <input
              className="picker-search"
              placeholder="Search any player from dataset…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingRight: search ? '32px' : '12px' }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setSearchResults([]); }}
                style={{
                  position: 'absolute', right: 8, top: 'px', display: 'flex', alignItems: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0, lineHeight: 1
                }}
                aria-label="Clear"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searching && <p style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>Searching…</p>}
          <div className="picker-list">
            {displayPlayers.map(p => (
              <div
                key={p.name}
                className={`picker-list-item ${selected?.name === p.name ? 'selected' : ''}`}
                onClick={() => setSelected(p)}
                style={selected?.name === p.name ? { borderColor: color, color } : {}}
              >
                <span className="picker-item-name">{p.name}</span>
                <span className="picker-item-meta">{p.position} · {p.overall}</span>
              </div>
            ))}
            {search.trim().length >= 2 && !searching && searchResults.length === 0 && (
              <p style={{ fontSize: 12, color: '#666', padding: '8px 0' }}>No players found.</p>
            )}
            {search.trim().length < 2 && famousPlayers.length === 0 && (
              <p style={{ fontSize: 12, color: '#666', padding: '8px 0' }}>Loading players…</p>
            )}
          </div>
        </>
      )}

      {mode === 'custom' && (
        <div className="picker-custom">
          <div style={{ position: 'relative' }}>
          <input className="text-input" placeholder="Player name" value={custom.player_name}
            onChange={e => setField('player_name', e.target.value)}
            style={{ paddingRight: custom.player_name ? '32px' : '12px', width: '100%', boxSizing: 'border-box' }} />
          {custom.player_name && (
            <button onClick={() => setField('player_name', '')}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 0 }}
              aria-label="Clear name">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
          <select className="text-input" value={custom.position}
            onChange={e => setField('position', e.target.value)}>
            <option value="">Select position</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="custom-sliders-grid">
            {[
              ['Age', 'age', 16, 45], ['Overall', 'overall', 40, 99],
              ['Potential', 'potential', 40, 99], ['Dribbling', 'dribbling', 1, 99],
              ['Finishing', 'finishing', 1, 99], ['Passing', 'passing', 1, 99],
              ['Ball Control', 'ballcontrol', 1, 99], ['Sprint Speed', 'sprintspeed', 1, 99],
              ['Reactions', 'reactions', 1, 99], ['Shot Power', 'shotpower', 1, 99],
              ['Stamina', 'stamina', 1, 99], ['Strength', 'strength', 1, 99],
              ['Vision', 'vision', 1, 99], ['Crossing', 'crossing', 1, 99],
            ].map(([label, key, min, max]) => (
              <div key={key} className="mini-slider-row">
                <span className="mini-slider-label">{label}</span>
                <input type="range" min={min} max={max} value={custom[key]}
                  onChange={e => setField(key, Number(e.target.value))} />
                <span className="mini-slider-val">{custom[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="picker-confirm-btn"
        style={{ borderColor: color, color }}
        onClick={handleConfirm}
        disabled={mode === 'famous' && !selected}
      >
        Set {label}
      </button>
    </div>
  );
}

export default function ComparePanel({ sessionId, onPredictSuccess }) {
  const [famousPlayers, setFamousPlayers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [result1, setResult1] = useState(null);
  const [result2, setResult2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const compareResultRef = useRef(null);

  useEffect(() => {
    getFamousPlayers().then(setFamousPlayers).catch(() => {});
    getPositions().then(setPositions).catch(() => {});
  }, []);

  const runCompare = async () => {
    if (!player1 || !player2) return;
    setLoading(true);
    setError(null);
    try {
      const baseline1 = (player1.overall || 70) - 5;
      const baseline2 = (player2.overall || 70) - 5;
      const payload1 = {
        player_name: player1.name || player1.player_name,
        age: player1.age, overall: player1.overall, potential: player1.potential,
        wage: player1.wage || 50000, position: player1.position,
        reputation: player1.reputation || 2, weakfoot: player1.weakfoot || 3,
        skillmoves: player1.skillmoves || 3, source: 'compare', crossing: player1.crossing || baseline1,
        finishing: player1.finishing, heading: player1.heading || 65,
        passing: player1.passing, dribbling: player1.dribbling,
        ballcontrol: player1.ballcontrol, acceleration: player1.acceleration,
        sprintspeed: player1.sprintspeed, reactions: player1.reactions,
        shotpower: player1.shotpower, stamina: player1.stamina,
        strength: player1.strength, vision: player1.vision,
      };
      const payload2 = {
        player_name: player2.name || player2.player_name,
        age: player2.age, overall: player2.overall, potential: player2.potential,
        wage: player2.wage || 50000, position: player2.position,
        reputation: player2.reputation || 2, weakfoot: player2.weakfoot || 3,
        skillmoves: player2.skillmoves || 3, source: 'compare', crossing: player2.crossing,
        finishing: player2.finishing, heading: player2.heading || 65,
        passing: player2.passing, dribbling: player2.dribbling,
        ballcontrol: player2.ballcontrol, acceleration: player2.acceleration,
        sprintspeed: player2.sprintspeed, reactions: player2.reactions,
        shotpower: player2.shotpower, stamina: player2.stamina,
        strength: player2.strength, vision: player2.vision,
      };
      const [d1, d2] = await Promise.all([
        predictPlayer(payload1, sessionId),
        predictPlayer(payload2, sessionId),
      ]);
      setResult1({ ...d1, ...payload1 });
      setResult2({ ...d2, ...payload2 });
      onPredictSuccess?.();
      requestAnimationFrame(() => {
        compareResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch {
      setError('Comparison failed. Check player data.');
    } finally {
      setLoading(false);
    }
  };

  const radarData = RADAR_STATS.map(s => ({
    stat: s.label,
    [result1?.player_name || 'P1']: result1?.[s.key] ?? 0,
    [result2?.player_name || 'P2']: result2?.[s.key] ?? 0,
  }));

  const name1 = result1?.player_name || 'Player 1';
  const name2 = result2?.player_name || 'Player 2';

  return (
    <div className="compare-panel">
      <div className="compare-pickers">
        <PlayerPicker
          label="Player 1"
          color="#00ff87"
          famousPlayers={famousPlayers} 
          positions={positions}
          onConfirm={setPlayer1}
        />
        <div className="compare-vs">VS</div>
        <PlayerPicker
          label="Player 2"
          color="#4dd2ff"
          famousPlayers={famousPlayers} 
          positions={positions}
          onConfirm={setPlayer2}
        />
      </div>

      {player1 && player2 && (
        <div className="compare-selected-summary">
          <SpotlightCard className="selected-card" spotlightColor="rgba(0,255,135,0.15)">
            <div className="selected-name" style={{ color: '#00ff87' }}>{player1.name || player1.player_name}</div>
            <div className="selected-meta">{player1.position} · OVR {player1.overall}</div>
          </SpotlightCard>
          <button className="compare-run-btn" onClick={runCompare} disabled={loading}>
            {loading ? 'Comparing…' : 'Compare →'}
          </button>
          <SpotlightCard className="selected-card" spotlightColor="rgba(77,210,255,0.15)">
            <div className="selected-name" style={{ color: '#4dd2ff' }}>{player2.name || player2.player_name}</div>
            <div className="selected-meta">{player2.position} · OVR {player2.overall}</div>
          </SpotlightCard>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {result1 && result2 && (
        <div className="compare-results" ref={compareResultRef}>
          {/* Value Cards */}
          <div className="compare-value-row">
            <BorderGlow colors={['#00ff87', '#00cc6a']} backgroundColor="#0d1117" borderRadius={14}>
              <div className="value-card">
                <div className="value-card-name" style={{ color: '#00ff87' }}>{name1}</div>
                <div className="value-card-val">€{result1.value_m}M</div>
                <div className="value-card-tier">{result1.category} Tier</div>
              </div>
            </BorderGlow>

            <div className="value-diff">
              {result1.value_m !== result2.value_m && (
                <>
                  <div className="diff-label">Difference</div>
                  <div className="diff-val">€{Math.abs(result1.value_m - result2.value_m).toFixed(1)}M</div>
                  <div className="diff-winner" style={{ color: result1.value_m > result2.value_m ? '#00ff87' : '#4dd2ff' }}>
                    {result1.value_m > result2.value_m ? name1 : name2} wins
                  </div>
                </>
              )}
              {result1.value_m === result2.value_m && <div className="diff-label">Equal Value</div>}
            </div>

            <BorderGlow colors={['#4dd2ff', '#2299cc']} backgroundColor="#0d1117" borderRadius={14}>
              <div className="value-card">
                <div className="value-card-name" style={{ color: '#4dd2ff' }}>{name2}</div>
                <div className="value-card-val">€{result2.value_m}M</div>
                <div className="value-card-tier">{result2.category} Tier</div>
              </div>
            </BorderGlow>
          </div>

          {/* Radar Chart */}
          <div className="compare-radar">
            <div className="compare-section-title">Attribute Radar</div>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                <PolarGrid stroke="#1e2a1e" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#888', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 99]} tick={false} axisLine={false} />
                <Radar name={name1} dataKey={name1} stroke="#00ff87" fill="#00ff87" fillOpacity={0.15} strokeWidth={2} />
                <Radar name={name2} dataKey={name2} stroke="#4dd2ff" fill="#4dd2ff" fillOpacity={0.15} strokeWidth={2} />
                <Legend wrapperStyle={{ color: '#888', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e2a1e', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stat Table */}
          <div className="compare-table">
            <div className="compare-section-title">Head to Head</div>
            <div className="stat-table-header">
              <span style={{ color: '#00ff87' }}>{name1}</span>
              <span>Stat</span>
              <span style={{ color: '#4dd2ff' }}>{name2}</span>
            </div>
            {TABLE_STATS.map(s => {
              const v1 = result1[s.key] ?? 0;
              const v2 = result2[s.key] ?? 0;
              const p1wins = s.lowerWins ? v1 < v2 : v1 > v2;
              const p2wins = s.lowerWins ? v2 < v1 : v2 > v1;
              return (
                <div key={s.key} className="stat-table-row">
                  <span className="stat-val" style={{ color: p1wins ? '#00ff87' : '#fff', fontWeight: p1wins ? 700 : 400 }}>
                    {v1}
                    {p1wins && <span className="win-dot" style={{ background: '#00ff87' }} />}
                  </span>
                  <span className="stat-name">{s.label}</span>
                  <span className="stat-val right" style={{ color: p2wins ? '#4dd2ff' : '#fff', fontWeight: p2wins ? 700 : 400 }}>
                    {p2wins && <span className="win-dot" style={{ background: '#4dd2ff' }} />}
                    {v2}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}