import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Award, Zap, Save } from 'lucide-react';
import axios from 'axios';
import "../Css/ColorG.css";
import Foote from '../Components/Foote';

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
    generateColors();
  };

  const handleSaveScore = async (event) => {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (gameId && token) {
      try {
        await axios.post(`/api/v1/games/${gameId}/score`, {
          score: score
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Score saved successfully to database!');
      } catch (err) {
        console.error('Failed to save score:', err);
        alert('Error saving score to database.');
      }
    } else {
      console.warn('Score registration skipped: Missing gameId or authentication token.');
      alert('Score save simulated! Please login to save to database.');
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
          <div className="save-input-group" style={{ justifyContent: 'center' }}>
            <button type="submit" className="save-submit-btn">
              <Save size={16} />
              Submit Score to Leaderboard
            </button>
          </div>
        </form>
      </div>

      <Foote />
    </div>
  );
};

export default ColorG;