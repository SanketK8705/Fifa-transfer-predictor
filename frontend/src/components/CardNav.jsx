import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './CardNav.css';

const TABS = [
  {
    id: 'predict',
    label: 'Predict',
    bgColor: '#0d1117',
    textColor: '#fff',
    description: 'Custom player & famous player valuation',
  },
  {
    id: 'search',
    label: 'Search',
    bgColor: '#111827',
    textColor: '#fff',
    description: 'Look up any player from the dataset',
  },
  {
    id: 'analysis',
    label: 'Analysis',
    bgColor: '#0d1117',
    textColor: '#fff',
    description: 'PCA, classification & regression insights',
  },
];

const CardNav = ({ activeTab, onTabChange, ease = 'power3.out' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 220;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content');
      if (contentEl) {
        const wasVisibility = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';
        contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisibility;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }
    return 220;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 40, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration: 0.4, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.07 }, '-=0.1');
    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;
      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) tlRef.current = newTl;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;
    if (!isExpanded) {
      setIsOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsOpen(false);
      tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
      tl.reverse();
    }
  };

  const setCardRef = i => el => {
    if (el) cardsRef.current[i] = el;
  };

  const selectTab = id => {
    onTabChange(id);
    toggleMenu();
  };

  return (
    <div className="card-nav-container">
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`}>
        <div className="card-nav-top">
          <div
            className={`hamburger-menu ${isOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? 'Close menu' : 'Open menu'}
            tabIndex={0}
          >
            <div className="hamburger-line" />
            <div className="hamburger-line" />
          </div>

          <div className="logo-container">
            <span className="brand-mark">FIFA<span className="accent">VAL</span></span>
          </div>

          <button
            type="button"
            className="card-nav-cta-button"
            onClick={() => onTabChange('history')}
          >
            History
          </button>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {TABS.map((tab, idx) => (
            <div
              key={tab.id}
              className={`nav-card ${activeTab === tab.id ? 'active' : ''}`}
              ref={setCardRef(idx)}
              style={{ backgroundColor: tab.bgColor, color: tab.textColor }}
              onClick={() => selectTab(tab.id)}
              role="button"
              tabIndex={0}
            >
              <div className="nav-card-label">{tab.label}</div>
              <div className="nav-card-links">
                <span className="nav-card-desc">{tab.description}</span>
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;