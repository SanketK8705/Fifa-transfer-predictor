import './StatSlider.css';

export default function StatSlider({ label, value, min = 1, max = 99, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="stat-slider">
      <div className="stat-slider-header">
        <span className="stat-slider-label">{label}</span>
        <span className="stat-slider-value">{value}</span>
      </div>
      <input
        type="range"
        className="stat-slider-input"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--fill': `${pct}%` }}
      />
    </div>
  );
}