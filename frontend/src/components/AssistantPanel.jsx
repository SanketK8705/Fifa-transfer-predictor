import { useState, useEffect, useRef } from 'react';
import SpotlightCard from './SpotlightCard.jsx';
import BorderGlow from './BorderGlow.jsx';
import { askAssistant } from '../api/client.js';
import './AssistantPanel.css';

const QUICK_PROMPTS = [
  { label: 'Should I sell Messi?', text: 'Should I sell L. Messi?' },
  { label: 'Salah vs Robben', text: 'Salah vs Robben' },
  { label: 'Why is Mbappé worth €96M?', text: 'Why is K. Mbappé worth 96M?' },
  { label: 'Best CM under €50M', text: 'Best CM under 50M for 4-3-3' },
  { label: 'Find a fast winger', text: 'Find a fast winger with high dribbling' },
];

export default function AssistantPanel() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'SCOUT REPORT: FIFAVal Tactical Agent active. Provide a player name or scouting query for immediate tactical analysis.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) {
      setInput('');
    }

    const userMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const responseText = await askAssistant(text);
      
      const assistantMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: responseText,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: 'SCOUT ERROR: Connection failed. Could not reach tactical databases.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const formatMessageText = (text) => {
    // Splits by double linebreaks to preserve scout report layout
    return text.split('\n').map((line, i) => {
      // Highlight bold parts or lines starting with bullet points
      if (line.startsWith('•') || line.startsWith('-')) {
        return (
          <div key={i} className="scout-bullet-line">
            {line}
          </div>
        );
      }
      
      if (line.startsWith('SCOUT REPORT:') || line.startsWith('VERDICT:') || line.startsWith('RECOMMENDATION:') || line.startsWith('SCOUT NOTES:')) {
        const parts = line.split(':');
        return (
          <div key={i} className="scout-header-line">
            <span className="scout-accent">{parts[0]}:</span>{parts.slice(1).join(':')}
          </div>
        );
      }
      
      return <p key={i} className="scout-text-paragraph">{line}</p>;
    });
  };

  return (
    <div className="assistant-panel">
      <div className="assistant-header-card">
        <SpotlightCard className="scout-intro-card" spotlightColor="rgba(0, 255, 135, 0.08)">
          <div className="scout-intro-content">
            <h3 className="scout-intro-title">FIFAVal Scout AI</h3>
            <p className="scout-intro-desc">
              Get transfer advice, run head-to-head comparisons, query squad builds under budget limits, or scout high-attribute archetypes using real FIFA 19 dataset parameters.
            </p>
          </div>
        </SpotlightCard>
      </div>

      <div className="chat-messages-container">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message-bubble ${
              msg.sender === 'user' ? 'message-bubble-user' : 'message-bubble-assistant'
            }`}
          >
            {msg.sender === 'assistant' ? (
              <BorderGlow
                className="assistant-bubble-glow"
                colors={['#00ff87', 'rgba(0, 255, 135, 0.3)', '#00ff87']}
                backgroundColor="#0d1117"
                borderRadius={12}
              >
                <div className="bubble-content">
                  {formatMessageText(msg.text)}
                </div>
              </BorderGlow>
            ) : (
              <div className="user-bubble-inner">
                {msg.text}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-message-bubble message-bubble-assistant">
            <BorderGlow
              className="assistant-bubble-glow"
              colors={['#00ff87', 'rgba(0, 255, 135, 0.3)', '#00ff87']}
              backgroundColor="#0d1117"
              borderRadius={12}
            >
              <div className="bubble-content typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </BorderGlow>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="quick-prompts-row">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt.label}
            className="quick-prompt-chip"
            onClick={() => handleSend(prompt.text)}
            disabled={loading}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <div className="chat-input-wrap">
          <input
            className="chat-text-input"
            type="text"
            placeholder="Ask the tactical analyst (e.g., 'Compare Hazard vs Salah' or 'Should I sell Modric?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send query"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
