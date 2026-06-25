import { useState, useEffect, useRef } from 'react';
import Stepper, { Step } from './Stepper.jsx';
import StatSlider from './StatSlider.jsx';
import Carousel from './Carousel.jsx';
import BorderGlow from './BorderGlow.jsx';
import SpotlightCard from './SpotlightCard.jsx';
import Counter from './Counter.jsx';
import GlassSurface from './GlassSurface.jsx';
import { predictPlayer, getFamousPlayers, getPositions } from '../api/client.js';
import './PredictPanel.css';

const STAT_FIELDS = [
  { key: 'crossing', label: 'Crossing' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'heading', label: 'Heading Accuracy' },
  { key: 'passing', label: 'Short Passing' },
  { key: 'dribbling', label: 'Dribbling' },
  { key: 'ballcontrol', label: 'Ball Control' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'sprintspeed', label: 'Sprint Speed' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'shotpower', label: 'Shot Power' },
  { key: 'stamina', label: 'Stamina' },
  { key: 'strength', label: 'Strength' },
  { key: 'vision', label: 'Vision' },
];

const DEFAULT_FORM = {
  player_name: '',
  age: 25,
  overall: 75,
  potential: 80,
  wage: 50000,
  position: '',
  reputation: 2,
  weakfoot: 3,
  skillmoves: 3,
  crossing: 65, finishing: 65, heading: 65, passing: 65,
  dribbling: 65, ballcontrol: 65, acceleration: 65, sprintspeed: 65,
  reactions: 65, shotpower: 65, stamina: 65, strength: 65, vision: 65,
};

export default function PredictPanel({ sessionId, onPredictSuccess }) {
  const [mode, setMode] = useState('famous');
  const [famousPlayers, setFamousPlayers] = useState([]);
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  useEffect(() => {
    getFamousPlayers().then(setFamousPlayers).catch(() => {});
    getPositions().then(setPositions).catch(() => {});
  }, []);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const selectFamousPlayer = (player) => {
    setForm({
      player_name: player.name,
      age: player.age,
      overall: player.overall,
      potential: player.potential,
      wage: player.wage,
      position: player.position,
      reputation: player.reputation,
      weakfoot: player.weakfoot,
      skillmoves: player.skillmoves,
      crossing: player.crossing,
      finishing: player.finishing,
      heading: player.heading,
      passing: player.passing,
      dribbling: player.dribbling,
      ballcontrol: player.ballcontrol,
      acceleration: player.acceleration,
      sprintspeed: player.sprintspeed,
      reactions: player.reactions,
      shotpower: player.shotpower,
      stamina: player.stamina,
      strength: player.strength,
      vision: player.vision,
    });
    runPredict({
      player_name: player.name,
      age: player.age, overall: player.overall, potential: player.potential,
      wage: player.wage, position: player.position, reputation: player.reputation,
      weakfoot: player.weakfoot, skillmoves: player.skillmoves,
      crossing: player.crossing, finishing: player.finishing, heading: player.heading,
      passing: player.passing, dribbling: player.dribbling, ballcontrol: player.ballcontrol,
      acceleration: player.acceleration, sprintspeed: player.sprintspeed,
      reactions: player.reactions, shotpower: player.shotpower,
      stamina: player.stamina, strength: player.strength, vision: player.vision,
    });
  };

  const runPredict = async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const data = await predictPlayer(payload, sessionId);
      setResult({
        ...data,
        player_name: payload.player_name,
        position: payload.position,
        age: payload.age,
        overall: payload.overall,
      });
      onPredictSuccess?.();
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setError(err?.response?.data?.error || 'Prediction failed. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!form.position) {
      setError('Select a position before predicting.');
      return;
    }
    runPredict({ ...form, player_name: form.player_name || 'Custom Player' });
  };

  const carouselItems = famousPlayers.map(p => ({
    id: p.name,
    title: p.name,
    description: `${p.position} · OVR ${p.overall} · ${p.club}`,
    _player: p,
  }));

  return (
    <div className="predict-panel">
      <div className="mode-toggle">
        <button className={mode === 'famous' ? 'active' : ''} onClick={() => setMode('famous')}>
          Famous Players
        </button>
        <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>
          Build Custom Player
        </button>
      </div>

      {mode === 'famous' && (
        <div className="famous-section">
          {carouselItems.length > 0 ? (
            <Carousel
              items={carouselItems}
              baseWidth={340}
              autoplay={false}
              loop={true}
              onSelect={item => selectFamousPlayer(item._player)}
            />
          ) : (
            <p className="muted-text">Loading players…</p>
          )}
          <div className="famous-grid">
            {famousPlayers.slice(0, 9).map(p => (
              <SpotlightCard
                key={p.name}
                className="famous-card"
                spotlightColor="rgba(0, 255, 135, 0.15)"
              >
                <div onClick={() => selectFamousPlayer(p)} className="famous-card-inner">
                  <div className="famous-card-name">{p.name}</div>
                  <div className="famous-card-meta">{p.position} · OVR {p.overall}</div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      )}

      {mode === 'custom' && (
        <GlassSurface width="100%" height="auto" borderRadius={18} opacity={0.05} className="custom-form-surface">
          <Stepper
            onFinalStepCompleted={handleCustomSubmit}
            backButtonText="Back"
            nextButtonText="Next"
          >
            <Step>
              <h3 className="step-title">Player Basics</h3>
              <input
                className="text-input"
                placeholder="Player name"
                value={form.player_name}
                onChange={e => setField('player_name', e.target.value)}
              />
              <select
                className="text-input"
                value={form.position}
                onChange={e => setField('position', e.target.value)}
              >
                <option value="">Select position</option>
                {positions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <StatSlider label="Age" value={form.age} min={16} max={45}
                onChange={v => setField('age', v)} />
            </Step>

            <Step>
              <h3 className="step-title">Core Ratings</h3>
              <StatSlider label="Overall Rating" value={form.overall} min={40} max={99}
                onChange={v => setField('overall', v)} />
              <StatSlider label="Potential Rating" value={form.potential} min={40} max={99}
                onChange={v => setField('potential', v)} />
              <StatSlider label="Weekly Wage (€)" value={form.wage} min={1000} max={500000}
                onChange={v => setField('wage', v)} />
            </Step>

            <Step>
              <h3 className="step-title">Attributes</h3>
              <div className="stat-grid">
                {STAT_FIELDS.map(f => (
                  <StatSlider key={f.key} label={f.label} value={form[f.key]} min={1} max={99}
                    onChange={v => setField(f.key, v)} />
                ))}
              </div>
            </Step>
          </Stepper>
        </GlassSurface>
      )}

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-banner">Calculating prediction…</div>}

      {result && (
        <div ref={resultRef}>
          <BorderGlow
            className="result-glow"
            colors={['#00ff87', '#00cc6a', '#00ff87']}
            backgroundColor="#0d1117"
            borderRadius={18}
          >
            <div className="result-content">
              <div className="result-player-name">{result.player_name}</div>
              <div className="result-player-meta">
                {result.position} · OVR {result.overall} · Age {result.age}
              </div>
              <div className="result-label">Predicted Market Value</div>
              <div className="result-value">
                <span className="result-currency">€</span>
                <Counter value={result.value_m} fontSize={56} gradientHeight={6} />
                <span className="result-suffix">M</span>
              </div>
              <div className={`result-category cat-${result.category?.toLowerCase()}`}>
                {result.category} Tier
              </div>

              <div className="model-compare-cards">
                {['lr', 'rf', 'gb'].map(key => (
                  <SpotlightCard key={key} className="model-card" spotlightColor="rgba(0,255,135,0.12)">
                    <div className="model-card-label">
                      {key === 'lr' ? 'Linear Regression' : key === 'rf' ? 'Random Forest' : 'Gradient Boosting'}
                    </div>
                    <div className="model-card-value">€{result.model_predictions[key]}M</div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          </BorderGlow>
        </div>
      )}
    </div>
  );
}