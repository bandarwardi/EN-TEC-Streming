import React, { useEffect, useState, useRef } from 'react';
import { updateSessionText } from './firebase';

function App() {
  const [text, setText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get session ID from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      setSessionId(session);
      setIsConnected(true);
      // Auto focus input when loaded
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setText(newText);
    
    if (sessionId) {
      updateSessionText(sessionId, newText);
      
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleClear = () => {
    setText('');
    if (sessionId) {
      updateSessionText(sessionId, '');
    }
    inputRef.current?.focus();
  };

  if (!sessionId) {
    return (
      <>
        <div className="bg-gradients">
          <div className="bg-blob-1"></div>
          <div className="bg-blob-2"></div>
        </div>
        <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="status-card" style={{ flexDirection: 'column', padding: '32px', textAlign: 'center' }}>
            <div className="status-indicator error" style={{ width: 16, height: 16, marginBottom: 16 }}></div>
            <h2 style={{ marginBottom: 8 }}>Session Error</h2>
            <p className="status-text">Please scan the QR Code from the TV screen again</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bg-gradients">
        <div className="bg-blob-1"></div>
        <div className="bg-blob-2"></div>
      </div>
      
      <div className="app-container">
        <div className="header">
          <h1 className="logo">ENTEC TV</h1>
          <p className="subtitle">Remote Keyboard</p>
        </div>

        <div className="input-container">
          <svg className="search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search here..."
            value={text}
            onChange={handleChange}
            dir="auto"
          />
          
          {text.length > 0 && (
            <button className="clear-btn" onClick={handleClear} aria-label="Clear text">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          
          <div className={`typing-indicator ${isTyping ? 'visible' : ''}`}>
            Typing...
          </div>
        </div>

        <div className="status-card">
          <div className={`status-indicator ${isConnected ? 'connected' : 'error'}`}></div>
          <span className="status-text">
            {isConnected ? 'Connected to TV successfully' : 'Connecting...'}
          </span>
        </div>
      </div>
    </>
  );
}

export default App;
