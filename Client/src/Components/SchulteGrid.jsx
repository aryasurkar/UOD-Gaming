import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
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
  const [gameId, setGameId] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting', 'submitted', 'failed', 'offline'

  useEffect(() => {
    axios.get('/api/v1/games')
      .then(res => {
        const game = res.data.games?.find(g => g.title === "Cyber Grid 1-25");
        if (game) setGameId(game._id);
      })
      .catch(err => console.error("Failed to load game info:", err));
  }, []);

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
    setRewards(null);
    setSubmitStatus('');
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

      // Online score submission
      const token = localStorage.getItem('token');
      if (gameId && token && finalScore > 0) {
        setSubmitStatus('submitting');
        axios.post(`/api/v1/games/${gameId}/score`, {
          score: finalScore,
          level: gridSize === 3 ? 1 : gridSize === 5 ? 2 : 3
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
          console.log('Score submitted successfully:', res.data);
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
              console.error('Failed to sync user stats:', e);
            }
          }
        })
        .catch(err => {
          console.error('Failed to submit score:', err);
          setSubmitStatus('failed');
        });
      } else {
        setSubmitStatus('offline');
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
    setRewards(null);
    setSubmitStatus('');
    clearInterval(timerRef.current);
    setGameState('idle');
    setTarget(1);
    setScore(0);
    setElapsedTime(0);
    shuffleGrid();
  };

  const isGameplayActive = gameState === 'playing';

  return (
    <div className="schulte-page-wrapper">
      {!isGameplayActive && (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      )}

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
              <span className="game-hud-label">Best</span>
              <span className="game-hud-value" style={{ color: 'var(--accent-yellow)', textShadow: '0 0 8px rgba(255,255,0,0.4)' }}>{highScore.toLocaleString()}</span>
            </div>

            <div className="game-hud-item" style={{ flexDirection: 'row', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="game-hud-label">Find</span>
                <span className="game-hud-value" style={{ color: 'var(--primary-neon)' }}>{gameState === 'completed' ? 'Done' : target}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="game-hud-label">Progress</span>
                <span className="game-hud-value" style={{ color: 'var(--accent-green)' }}>
                  {gameState === 'completed' ? '100%' : `${Math.round(((target - 1) / (gridSize * gridSize)) * 100)}%`}
                </span>
              </div>
            </div>

            <div className="game-hud-item">
              <span className="game-hud-label">Timer</span>
              <span className="game-hud-value">{elapsedTime.toFixed(2)}s</span>
            </div>
          </div>

          <div className="game-play-area">
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
                  style={{ position: 'absolute', zIndex: 12 }}
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
                  <div className="schulte-start-overlay completed" style={{ position: 'absolute', zIndex: 12 }}>
                    <h2>Sequence Complete!</h2>
                    <p>Elapsed Time: <strong>{elapsedTime.toFixed(2)}s</strong></p>
                    <p className="text-emerald-400" style={{ marginBottom: '8px' }}>Score Achieved: <strong>{score.toLocaleString()}</strong></p>
                    
                    {submitStatus === 'submitting' && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '8px 0' }}>Saving score online...</p>
                    )}
                    {submitStatus === 'submitted' && rewards && (
                      <div className="game-over-rewards" style={{ margin: '12px auto', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.9rem' }}>
                        <div style={{ color: '#ffd700', marginBottom: '4px' }}>🪙 +{rewards.coinsEarned} Coins</div>
                        <div style={{ color: 'var(--primary-neon)', marginBottom: '4px' }}>⚡ +{rewards.expGained} XP</div>
                        {rewards.leveledUp && (
                          <div style={{ color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,255,136,0.5)', marginTop: '4px' }}>LEVEL UP! (Lv {rewards.level})</div>
                        )}
                      </div>
                    )}
                    {submitStatus === 'failed' && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--secondary-neon)', margin: '8px 0' }}>Failed to save score online.</p>
                    )}
                    {submitStatus === 'offline' && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--accent-orange)', margin: '8px 0' }}>Log in to save stats & earn coins!</p>
                    )}

                    <button className="btn btn-primary mt-4" onClick={initGame}>Insert Coin (Play Again)</button>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="schulte-controls" style={{ display: 'flex', gap: '15px', marginTop: '10px', justifyContent: 'center' }}>
          <button className="btn btn-reset" onClick={resetGame}>
            <RotateCcw size={16} />
            <span>Reset Grid</span>
          </button>
          <button className="btn btn-reset" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default SchulteGrid;
