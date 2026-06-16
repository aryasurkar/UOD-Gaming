import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Play, 
  Pause, 
  HelpCircle,
  Volume2,
  VolumeX,
  Zap,
  Gamepad2
} from 'lucide-react';
import '../Css/SchulteGrid.css';
import Foote from './Foote';

const playSound = (type, enabled = true) => {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const SchulteGrid = () => {
  // Game States
  const [gridSize, setGridSize] = useState(5); // 3 | 5 | 7
  const [grid, setGrid] = useState([]);
  const [target, setTarget] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle | playing | completed
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [wrongCellId, setWrongCellId] = useState(null); // index of wrong cell

  // Timer references
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // Sync high score when gridSize switches
  useEffect(() => {
    const key = `schulte_high_score_${gridSize}`;
    const stored = localStorage.getItem(key) ? parseInt(localStorage.getItem(key)) : 0;
    setHighScore(stored);
  }, [gridSize]);

  const shuffleGrid = () => {
    const totalCells = gridSize * gridSize;
    const base = Array.from({ length: totalCells }, (_, i) => ({
      id: i,
      value: i + 1,
      status: 'idle'
    }));

    // Fisher-Yates Shuffle
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = base[i];
      base[i] = base[j];
      base[j] = temp;
    }
    setGrid(base);
  };

  useEffect(() => {
    shuffleGrid();
    return () => clearInterval(timerRef.current);
  }, [gridSize]);

  const initGame = () => {
    playSound('start', soundEnabled);
    setTarget(1);
    setScore(0);
    setElapsedTime(0);
    setGameState('playing');
    shuffleGrid();
    
    startTimeRef.current = Date.now();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(elapsed);
    }, 10);
  };

  const handleCellClick = (cell, index) => {
    if (gameState === 'idle') {
      initGame();
      if (cell.value === 1) {
        processCorrectClick(index);
      } else {
        processWrongClick(index);
      }
      return;
    }

    if (gameState !== 'playing') return;

    if (cell.value === target) {
      processCorrectClick(index);
    } else {
      processWrongClick(index);
    }
  };

  const processCorrectClick = (index) => {
    playSound('correct', soundEnabled);
    
    setGrid(prev => {
      const next = [...prev];
      next[index].status = 'correct';
      return next;
    });

    const maxVal = gridSize * gridSize;
    if (target === maxVal) {
      // GAME COMPLETED!
      clearInterval(timerRef.current);
      setGameState('completed');
      playSound('win', soundEnabled);

      const finalTime = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(finalTime);

      // Inverse speed scoring logic based on grid size
      let basePoints = 100000;
      if (gridSize === 3) basePoints = 20000;
      if (gridSize === 7) basePoints = 300000;

      const finalScore = Math.max(10, Math.round(basePoints / finalTime));
      setScore(finalScore);

      const key = `schulte_high_score_${gridSize}`;
      if (finalScore > highScore) {
        localStorage.setItem(key, finalScore.toString());
        setHighScore(finalScore);
      }
    } else {
      setTarget(prev => prev + 1);
    }
  };

  const processWrongClick = (index) => {
    playSound('wrong', soundEnabled);
    setWrongCellId(index);

    setTimeout(() => {
      setWrongCellId(null);
    }, 350);
  };

  const resetGame = () => {
    clearInterval(timerRef.current);
    setGameState('idle');
    setTarget(1);
    setScore(0);
    setElapsedTime(0);
    shuffleGrid();
  };

  return (
    <div className="schulte-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Grid Finder</span>
      </div>

      <div className="game-content-card schulte-grid-layout">
        {/* Playfield panel */}
        <div className="schulte-play-panel">
          <div className="game-header text-left">
            <h1 className="game-title">Cyber Grid {gridSize}x{gridSize}</h1>
            <p className="game-subtitle">Reflex Schulte Table. Locate and click numbers from 1 to {gridSize * gridSize} in ascending sequence as fast as you can.</p>
          </div>

          <div className="grid-container-wrapper">
            <div 
              className={`schulte-5x5-grid size-${gridSize}`}
              style={{
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize}, 1fr)`
              }}
            >
              {grid.map((cell, index) => {
                const isCorrect = cell.status === 'correct';
                const isWrong = wrongCellId === index;

                return (
                  <motion.button
                    key={cell.id}
                    onClick={() => handleCellClick(cell, index)}
                    className={`schulte-cell ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                    animate={isWrong ? { x: [-6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.3 }}
                    disabled={isCorrect || gameState === 'completed'}
                  >
                    {cell.value}
                  </motion.button>
                );
              })}
            </div>

            {gameState === 'idle' && (
              <div 
                className="schulte-start-overlay" 
                onClick={(e) => {
                  if (e.target.closest('.size-btn')) return;
                  initGame();
                }}
              >
                <Gamepad2 className="mb-4 text-cyan-400 animate-pulse" size={48} />
                <p>Press <strong>START GAME</strong> or <strong>CLICK A CELL</strong> to Begin</p>
                
                {/* Grid Size selector row */}
                <div className="grid-size-selector mb-6">
                  <span className="selector-label">Choose Grid Size:</span>
                  <div className="size-buttons-row">
                    {[3, 5, 7].map(size => (
                      <button
                        key={size}
                        className={`size-btn ${gridSize === size ? 'active' : ''}`}
                        onClick={() => setGridSize(size)}
                      >
                        {size}x{size}
                      </button>
                    ))}
                  </div>
                </div>

                <span>Find and click numbers 1 through {gridSize * gridSize} sequentially. Faster times score higher!</span>
                <button className="btn btn-primary mt-4" onClick={initGame}>Start Game</button>
              </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
              {gameState === 'completed' && (
                <div className="schulte-start-overlay completed">
                  <h2>Sequence Complete!</h2>
                  <p>Elapsed Time: <strong>{elapsedTime.toFixed(2)}s</strong></p>
                  <p className="text-emerald-400">Score Achieved: <strong>{score.toLocaleString()}</strong></p>
                  <button className="btn btn-primary mt-4" onClick={initGame}>Insert Coin (Play Again)</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="schulte-sidebar-panel">
          <div className="stats-dashboard vertical">
            <div className="stat-card">
              <Trophy className="stat-icon neon-gold" size={18} />
              <div className="stat-info">
                <span className="stat-label">High Score ({gridSize}x{gridSize})</span>
                <span className="stat-value">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <Zap className="stat-icon neon-blue" size={18} />
              <div className="stat-info">
                <span className="stat-label">Next Target</span>
                <span className="stat-value">{gameState === 'completed' ? 'Done' : `Find: ${target}`}</span>
              </div>
            </div>

            <div className="stat-card">
              <Gamepad2 className="stat-icon neon-green" size={18} />
              <div className="stat-info">
                <span className="stat-label">Timer</span>
                <span className="stat-value">{elapsedTime.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          {/* Quick HUD Progress bar */}
          <div className="progress-hud-panel mb-6">
            <h3>Reflex Progress</h3>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill"
                style={{ width: `${gameState === 'completed' ? 100 : ((target - 1) / (gridSize * gridSize)) * 100}%` }}
              />
            </div>
            <div className="progress-labels">
              <span>0%</span>
              <span>{Math.round(((target - 1) / (gridSize * gridSize)) * 100)}%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="action-buttons-column mt-4">
            <button className="btn btn-reset mb-4" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button className="btn btn-reset" onClick={resetGame}>
              <RotateCcw size={16} />
              <span>Reset Grid</span>
            </button>
          </div>
        </div>
      </div>

      <Foote />
    </div>
  );
};

export default SchulteGrid;
