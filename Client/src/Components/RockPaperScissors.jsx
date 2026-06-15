import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Zap, 
  Gamepad2,
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import '../Css/RockPaperScissors.css';
import Foote from './Foote';

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'select') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'draw') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const choices = [
  { id: 'rock', name: 'Rock', emoji: '🪨', color: '#ff0055' },
  { id: 'paper', name: 'Paper', emoji: '📄', color: '#00d4ff' },
  { id: 'scissors', name: 'Scissors', emoji: '✂️', color: '#00ff88' }
];

const RockPaperScissors = () => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [aiChoice, setAiChoice] = useState(null);
  const [result, setResult] = useState(''); // 'win', 'lose', 'draw', ''
  const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(
    localStorage.getItem('rps_best_streak') ? parseInt(localStorage.getItem('rps_best_streak')) : 0
  );
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [rollingIndex, setRollingIndex] = useState(0);

  // AI rolling animation during choices evaluation
  useEffect(() => {
    let interval;
    if (isEvaluating) {
      interval = setInterval(() => {
        setRollingIndex(prev => (prev + 1) % 3);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isEvaluating]);

  const handleChoice = (choiceId) => {
    if (isEvaluating) return;
    
    playSound('select');
    setPlayerChoice(choiceId);
    setAiChoice(null);
    setResult('');
    setIsEvaluating(true);

    // Evaluate result after 1 second delay
    setTimeout(() => {
      const randomChoice = choices[Math.floor(Math.random() * 3)].id;
      setAiChoice(randomChoice);
      setIsEvaluating(false);

      evaluateGame(choiceId, randomChoice);
    }, 1000);
  };

  const evaluateGame = (pChoice, aChoice) => {
    if (pChoice === aChoice) {
      setResult('draw');
      playSound('draw');
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      setStreak(0);
    } else if (
      (pChoice === 'rock' && aChoice === 'scissors') ||
      (pChoice === 'paper' && aChoice === 'rock') ||
      (pChoice === 'scissors' && aChoice === 'paper')
    ) {
      setResult('win');
      playSound('win');
      setScores(prev => ({ ...prev, player: prev.player + 1 }));
      setStreak(prev => {
        const nextStreak = prev + 1;
        if (nextStreak > bestStreak) {
          localStorage.setItem('rps_best_streak', nextStreak.toString());
          setBestStreak(nextStreak);
        }
        return nextStreak;
      });
    } else {
      setResult('lose');
      playSound('lose');
      setScores(prev => ({ ...prev, ai: prev.ai + 1 }));
      setStreak(0);
    }
  };

  const resetScores = () => {
    setScores({ player: 0, ai: 0, draws: 0 });
    setStreak(0);
    setPlayerChoice(null);
    setAiChoice(null);
    setResult('');
  };

  return (
    <div className="rps-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Rock Paper Scissors</span>
      </div>

      <div className="game-content-card">
        <div className="game-header">
          <h1 className="game-title">Rock Paper Scissors</h1>
          <p className="game-subtitle">Player vs CPU. Make your move and match the AI opponent.</p>
        </div>

        {/* Stats Dashboard */}
        <div className="stats-dashboard">
          <div className="stat-card">
            <Trophy className="stat-icon neon-blue" size={20} />
            <div className="stat-info">
              <span className="stat-label">Your Wins</span>
              <span className="stat-value">{scores.player}</span>
            </div>
          </div>

          <div className="stat-card">
            <Gamepad2 className="stat-icon neon-pink" size={20} />
            <div className="stat-info">
              <span className="stat-label">CPU Wins</span>
              <span className="stat-value">{scores.ai}</span>
            </div>
          </div>

          <div className="stat-card">
            <TrendingUp className="stat-icon neon-green" size={20} />
            <div className="stat-info">
              <span className="stat-label">Current Streak</span>
              <span className="stat-value">{streak}</span>
            </div>
          </div>

          <div className="stat-card">
            <Award className="stat-icon neon-gold" size={20} />
            <div className="stat-info">
              <span className="stat-label">Best Streak</span>
              <span className="stat-value">{bestStreak}</span>
            </div>
          </div>
        </div>

        {/* Arena Screen */}
        <div className="battle-arena">
          <div className="arena-side">
            <span className="side-label">You</span>
            <div className={`choice-display ${result === 'win' ? 'winner-glow' : result === 'lose' ? 'loser-glow' : ''}`}>
              {playerChoice ? (
                <div className="choice-large" style={{ color: choices.find(c => c.id === playerChoice).color }}>
                  <span className="emoji">{choices.find(c => c.id === playerChoice).emoji}</span>
                  <span className="name">{choices.find(c => c.id === playerChoice).name}</span>
                </div>
              ) : (
                <HelpCircle size={48} className="inactive-icon" />
              )}
            </div>
          </div>

          <div className="vs-sign">VS</div>

          <div className="arena-side">
            <span className="side-label">CPU</span>
            <div className={`choice-display ${result === 'lose' ? 'winner-glow' : result === 'win' ? 'loser-glow' : ''}`}>
              {isEvaluating ? (
                <div className="choice-large rolling">
                  <span className="emoji">{choices[rollingIndex].emoji}</span>
                  <span className="name">Thinking...</span>
                </div>
              ) : aiChoice ? (
                <div className="choice-large" style={{ color: choices.find(c => c.id === aiChoice).color }}>
                  <span className="emoji">{choices.find(c => c.id === aiChoice).emoji}</span>
                  <span className="name">{choices.find(c => c.id === aiChoice).name}</span>
                </div>
              ) : (
                <HelpCircle size={48} className="inactive-icon" />
              )}
            </div>
          </div>
        </div>

        {/* Outcome Message */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div 
              className={`result-banner ${result}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              {result === 'win' && "You Defeated CPU! 🔥"}
              {result === 'lose' && "CPU Won This Round! 💀"}
              {result === 'draw' && "It's a Stand-off! 🤝"}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Choices */}
        <div className="choices-panel">
          <h2>Choose Your Move</h2>
          <div className="choices-buttons">
            {choices.map(c => (
              <motion.button
                key={c.id}
                className="choice-btn"
                style={{ '--btn-border': c.color }}
                whileHover={{ scale: 1.08, boxShadow: `0 0 20px ${c.color}66` }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleChoice(c.id)}
                disabled={isEvaluating}
              >
                <span className="btn-emoji">{c.emoji}</span>
                <span className="btn-name">{c.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="control-actions">
          <button className="btn btn-reset" onClick={resetScores}>
            <RotateCcw size={18} />
            <span>Reset Scoreboard</span>
          </button>
        </div>
      </div>

      <Foote />
    </div>
  );
};

export default RockPaperScissors;
