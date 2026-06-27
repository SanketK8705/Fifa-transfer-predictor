import React, { useState, useEffect, useCallback } from 'react';
import Ferrofluid from './components/Ferrofluid.jsx';
import CardNav from './components/CardNav.jsx';
import StaggeredMenu from './components/StaggeredMenu.jsx';
import Dock from './components/Dock.jsx';
import ShinyText from './components/ShinyText.jsx';
import RotatingText from './components/RotatingText.jsx';
import LogoLoop from './components/LogoLoop.jsx';
import ScrollFloat from './components/ScrollFloat.jsx';
import StarBorder from './components/StarBorder.jsx';
import PredictPanel from './components/PredictPanel.jsx';
import SearchPanel from './components/SearchPanel.jsx';
import AnalysisPanel from './components/AnalysisPanel.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import ComparePanel from './components/ComparePanel.jsx';
import AssistantPanel from './components/AssistantPanel.jsx';
import { getHistory } from './api/client.js';
import './App.css';

function getSessionId() {
  let id = localStorage.getItem('fifa_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('fifa_session_id', id);
  }
  return id;
}

const PredictIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const ChartIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18M7 16v-4m5 4V8m5 8v-7" />
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v5h5M3.05 13a9 9 0 1 0 2-7.36L3 8" />
    <path d="M12 7v5l4 2" />
  </svg>
);
const CompareIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7" />
  </svg>
);
const ScoutIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CLUB_BADGES = [
  { node: <span className="club-badge">Premier League</span> },
  { node: <span className="club-badge">La Liga</span> },
  { node: <span className="club-badge">Serie A</span> },
  { node: <span className="club-badge">Bundesliga</span> },
  { node: <span className="club-badge">Ligue 1</span> },
  { node: <span className="club-badge">5000+ Players</span> },
];

export default function App() {
  const [activeTab, setActiveTabRaw] = useState('predict');

  const setActiveTab = (tab) => {
    if (tab === activeTab) return;
    setActiveTabRaw(tab);
    if (tab === 'analysis') {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
    }
  };

  const sessionId = getSessionId();
  const [history, setHistory] = useState(null);
  const loadHistory = useCallback(() => {
    getHistory(sessionId).then(setHistory).catch(() => {});
  }, [sessionId]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const dockItems = [
    { icon: <PredictIcon />, label: 'Predict', onClick: () => setActiveTab('predict') },
    { icon: <SearchIcon />, label: 'Search', onClick: () => setActiveTab('search') },
    { icon: <CompareIcon />, label: 'Compare', onClick: () => setActiveTab('compare') },
    { icon: <ScoutIcon />, label: 'Scout AI', onClick: () => setActiveTab('scout') },
    { icon: <ChartIcon />, label: 'Analysis', onClick: () => setActiveTab('analysis') },
    { icon: <HistoryIcon />, label: 'History', onClick: () => setActiveTab('history') },
  ];

  const staggeredItems = [
    { label: 'Predict', ariaLabel: 'Go to Predict tab', onClick: () => setActiveTab('predict') },
    { label: 'Search', ariaLabel: 'Go to Search tab', onClick: () => setActiveTab('search') },
    { label: 'Compare', ariaLabel: 'Go to Compare tab', onClick: () => setActiveTab('compare') },
    { label: 'Scout AI', ariaLabel: 'Go to Scout AI tab', onClick: () => setActiveTab('scout') },
    { label: 'Analysis', ariaLabel: 'Go to Analysis tab', onClick: () => setActiveTab('analysis') },
    { label: 'History', ariaLabel: 'Go to History tab', onClick: () => setActiveTab('history') },
  ];

  return (
    <>
      <Ferrofluid
        colors={['#00ff87', '#0d1117', '#00ff87']}
        flowDirection="down"
        speed={0.35}
        scale={1.8}
        turbulence={0.8}
        opacity={0.5}
        mouseInteraction={true}
      />

      <div className="desktop-nav-wrap">
        <CardNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <div className="mobile-nav-wrap">
        <StaggeredMenu
          position="right"
          items={staggeredItems}
          displaySocials={false}
          displayItemNumbering={true}
          accentColor="#00ff87"
          isFixed={true}
        />
      </div>

      <div className="app-shell">
        {activeTab === 'predict' && (
          <header className="hero">
            <ShinyText
              text="FIFA Transfer Value Predictor"
              className="hero-title"
              speed={3}
            />
            <div className="hero-subtitle-row">
              <span className="hero-subtitle-prefix">Powered by</span>
              <RotatingText
                texts={['Gradient Boosting', '21 Player Attributes', '5,000+ Players Analyzed', 'PCA Dimensionality Reduction']}
                mainClassName="hero-rotating text-rotate-pill"
                rotationInterval={2800}
                staggerDuration={0.02}
              />
            </div>
            <div className="logo-strip">
              <LogoLoop
                logos={CLUB_BADGES}
                speed={60}
                direction="left"
                logoHeight={20}
                gap={40}
                fadeOut={true}
                fadeOutColor="#060910"
                pauseOnHover={true}
              />
            </div>
          </header>
        )}

        <main className="app-main">
          <div className={`tab-panel ${activeTab === 'predict' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Make a Prediction</ScrollFloat>
            <PredictPanel sessionId={sessionId} onPredictSuccess={loadHistory} />
          </div>

          <div className={`tab-panel ${activeTab === 'search' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Search Players</ScrollFloat>
            <SearchPanel sessionId={sessionId} onPredictSuccess={loadHistory} />
          </div>

          <div className={`tab-panel ${activeTab === 'compare' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Compare Players</ScrollFloat>
            <ComparePanel sessionId={sessionId} onPredictSuccess={loadHistory} />
          </div>

          <div className={`tab-panel ${activeTab === 'scout' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Scout AI Assistant</ScrollFloat>
            <AssistantPanel />
          </div>

          <div className={`tab-panel ${activeTab === 'analysis' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Model Analysis</ScrollFloat>
            <AnalysisPanel />
          </div>

          <div className={`tab-panel ${activeTab === 'history' ? 'tab-panel--active' : ''}`}>
            <ScrollFloat containerClassName="section-header">Your Predictions</ScrollFloat>
            <HistoryPanel sessionId={sessionId} history={history} onRefresh={loadHistory} />
          </div>
        </main>

        <footer className="app-footer">
          <StarBorder as="div" color="#00ff87" speed="5s" thickness={1}>
            <span className="footer-text">Built with Flask, scikit-learn &amp; React</span>
          </StarBorder>
        </footer>
      </div>

      <Dock items={dockItems} />
    </>
  );
}