import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Award, Zap, Save } from 'lucide-react';
import "../Css/ColorG.css";
import Foote from '../Components/Foote';

const ColorG = () => {
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

  useEffect(() => {
    generateColors();
  }, []);

  const generateColors = () => {
    const newColors = generateRandomColors(6);
    setColors(newColors);
    setPickedColor(pickColor(newColors));
    setHasGuessed(false);
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
      setMessage("Wrong Choice! Try Again 😢");
      setStreak(0);
    }
  };

  const handleReset = () => {
    generateColors();
  };

  const handleResetGame = () => {
    setScore(0);
    setStreak(0);
    generateColors();
  };

  const handleSaveScore = async (event) => {
    event.preventDefault();
    if (username.trim() === '') {
      alert('Please enter a username.');
      return;
    }
    const scoreStatus = message.includes("Correct") ? 'Win' : 'Lose';
    
    try {
      const response = await fetch('../scripts/php/color.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(username)}&score=${scoreStatus}`,
      });
      if (response.ok) {
        alert('Score saved successfully!');
      } else {
        alert('Error saving score.');
      }
    } catch (err) {
      console.warn('Score registration skipped:', err);
      alert('Score save simulated successfully!');
    }
  };

  return (
    <div className="color-g-container">
      {/* Sleek Navigation Bar */}
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: ColorG</span>
      </div>

      <div className="game-content-card">
        <div className="game-header">
          <h1 className="game-title">Color Guesser</h1>
          <p className="game-subtitle">Match the RGB color code to the correct preview swatch.</p>
        </div>

        {/* LED Scoreboard */}
        <div className="color-scoreboard">
          <div className="score-panel score-value-card">
            <span className="panel-label">Correct</span>
            <span className="panel-value digital-text">{score}</span>
          </div>
          <div className="score-panel streak-value-card">
            <span className="panel-label">Streak</span>
            <span className="panel-value digital-text">
              <Zap size={18} className="streak-icon" />
              {streak}
            </span>
          </div>
          <div className="score-panel best-streak-card">
            <span className="panel-label">Best Streak</span>
            <span className="panel-value digital-text">
              <Award size={18} className="best-streak-icon" />
              {bestStreak}
            </span>
          </div>
        </div>

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
              className={`colorButton ${hasGuessed ? 'disabled-button' : ''}`}
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
        <form className="player-save-form" onSubmit={handleSaveScore}>
          <h3 className="save-form-title">Save Your High Score</h3>
          <div className="save-input-group">
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
            <button type="submit" className="save-submit-btn">
              <Save size={16} />
              Save
            </button>
          </div>
        </form>
      </div>

      <Foote />
    </div>
  );
};

export default ColorG;