import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Award, Zap, Save } from 'lucide-react';
import axios from 'axios';
import "../Css/ColorG.css";

const ColorG = () => {
  const location = useLocation();
  const [gameId, setGameId] = useState(null);
  
  useEffect(() => {
    if (location.state?.gameId) {
      setGameId(location.state.gameId);
    } else {
      // Fallback: fetch game ID by title
      axios.get('/api/v1/games')
        .then(res => {
          const game = res.data.games?.find(g => g.title === "Color Guesser RGB");
          if (game) setGameId(game._id);
        })
        .catch(err => console.error("Failed to load game info:", err));
    }
  }, [location.state]);

  const [colors, setColors] = useState([]);
  const [pickedColor, setPickedColor] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    return parseInt(localStorage.getItem('colorg_beststreak') || '0', 10);
  });
  const [hasGuessed, setHasGuessed] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [rewards, setRewards] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting', 'submitted', 'failed', 'offline'

  useEffect(() => {
    generateColors();
  }, []);

  const generateColors = () => {
    const newColors = generateRandomColors(6);
    setColors(newColors);
    setPickedColor(pickColor(newColors));
    setHasGuessed(false);
    setSelectedColor('');
    setMessage('');
  };


  const pickColor = (colors) => {
    const random = Math.floor(Math.random() * colors.length);
    return colors[random];
  };

  const generateRandomColors = (num) => {
    const arr = [];
    for (let i = 0; i < num; i++) {
      arr.push(randomColor());
    }
    return arr;
  };

  const randomColor = () => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleColorClick = (color) => {
    if (hasGuessed) return; // prevent multiple clicks in the same round

    setHasGuessed(true);
    setSelectedColor(color);
    if (color === pickedColor) {
      setMessage("Correct! 🎉");
      setScore(prev => prev + 1);
      setStreak(prev => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
          localStorage.setItem('colorg_beststreak', newStreak.toString());
        }
        return newStreak;
      });
      // Change all option swatches to the correct color
      setColors(colors.map(() => color));
    } else {
      setMessage(`Wrong Choice! The correct color was ${pickedColor}. 😢`);
      setStreak(0);
    }
  };


  const handleReset = () => {
    generateColors();
  };

  const handleResetGame = () => {
    setScore(0);
    setStreak(0);
    setRewards(null);
    setSubmitStatus('');
    generateColors();
  };

  const handleSaveScore = async (event) => {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (gameId && token) {
      setSubmitStatus('submitting');
      setRewards(null);
      try {
        const res = await axios.post(`/api/v1/games/${gameId}/score`, {
          score: score
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRewards({
          coinsEarned: res.data.coinsEarned,
          expGained: res.data.expGained,
          level: res.data.level,
          leveledUp: res.data.leveledUp
        });
        setSubmitStatus('submitted');
        
        // Sync local storage user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userObj = JSON.parse(storedUser);
            userObj.coins = res.data.totalCoins;
            if (!userObj.gameStats) userObj.gameStats = {};
            userObj.gameStats.level = res.data.level;
            localStorage.setItem('user', JSON.stringify(userObj));
            window.dispatchEvent(new Event('user-stats-changed'));
          } catch (e) {
            console.error('Failed to update local storage user info:', e);
          }
        }
      } catch (err) {
        console.error('Failed to save score:', err);
        setSubmitStatus('failed');
      }
    } else {
      console.warn('Score registration skipped: Missing gameId or authentication token.');
      setSubmitStatus('offline');
    }
  };

  return (
    <div className="color-g-container">
      {/* Floating minimal back button overlay */}
      <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
        <ArrowLeft size={20} />
      </Link>

      <div className="game-content-card">
        {/* Arcade Cabinet Frame */}
        <div className="cabinet-screen crt-screen">
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          {/* Floating HUD Overlays */}
          <div className="game-hud-container">
            <div className="game-hud-item">
              <span className="game-hud-label">Correct</span>
              <span className="game-hud-value">{score}</span>
            </div>

            <div className="game-hud-item">
              <span className="game-hud-label">Streak</span>
              <span className="game-hud-value" style={{ color: 'var(--primary-neon)' }}>{streak}</span>
            </div>

            <div className="game-hud-item">
              <span className="game-hud-label">Best Streak</span>
              <span className="game-hud-value" style={{ color: 'var(--accent-yellow)' }}>{bestStreak}</span>
            </div>
          </div>

          <div className="game-play-area">
            {/* RGB Code Swatch */}
            <div className="swatch-wrapper">
              <span className="swatch-label">Find this color code:</span>
              <div className="color-code-display">{pickedColor.toUpperCase()}</div>
            </div>

            {/* Color Choices Grid */}
            <div className="choices-grid">
              {colors.map((color, index) => (
                <button
                  key={index}
                  style={{ backgroundColor: color }}
                  className={`colorButton ${hasGuessed ? 'disabled-button' : ''} ${
                    hasGuessed && color === pickedColor ? 'correct-swatch' : ''
                  } ${
                    hasGuessed && color === selectedColor && color !== pickedColor ? 'incorrect-swatch' : ''
                  }`}
                  onClick={() => handleColorClick(color)}
                  disabled={hasGuessed}
                  title={hasGuessed ? color : 'Guess color'}
                />
              ))}
            </div>

            {/* Message Banner */}
            {message && (
              <div className={`message-banner ${message.includes('Correct') ? 'win-banner' : 'lose-banner'}`}>
                {message.includes('Correct') ? <Trophy size={18} /> : <RotateCcw size={18} />}
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Control Panel */}
        <div className="game-controls">
          <button className="control-btn next-btn" onClick={handleReset}>
            Next Swatch
          </button>
          <button className="control-btn reset-game-btn" onClick={handleResetGame}>
            Reset Scores
          </button>
        </div>

        {/* Save Score Section */}
        <div className="player-save-form" style={{ marginTop: '10px', padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="save-form-title" style={{ fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>Leaderboard Score Submission</h3>
          
          {submitStatus === 'submitting' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Saving score online...</p>
          )}

          {submitStatus === 'submitted' && rewards && (
            <div className="rewards-display-banner" style={{ display: 'inline-block', margin: '6px auto', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '2px' }}>🪙 +{rewards.coinsEarned} Coins</div>
              <div style={{ color: 'var(--primary-neon)', fontSize: '0.85rem' }}>⚡ +{rewards.expGained} XP Gained</div>
              {rewards.leveledUp && (
                <div style={{ color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,255,136,0.5)', marginTop: '4px' }}>LEVEL UP! (Lv {rewards.level})</div>
              )}
            </div>
          )}

          {submitStatus === 'failed' && (
            <p style={{ color: 'var(--secondary-neon)', fontSize: '0.9rem' }}>Failed to submit score. Try again.</p>
          )}

          {submitStatus === 'offline' && (
            <p style={{ color: 'var(--accent-orange)', fontSize: '0.9rem' }}>Please log in to submit your score and earn coins!</p>
          )}

          {submitStatus !== 'submitting' && submitStatus !== 'submitted' && (
            <form onSubmit={handleSaveScore} className="save-input-group" style={{ justifyContent: 'center' }}>
              <button type="submit" className="save-submit-btn">
                <Save size={16} />
                Submit Score to Leaderboard
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorG;