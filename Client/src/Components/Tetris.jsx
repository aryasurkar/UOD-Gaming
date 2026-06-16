import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  TrendingUp,
  Award
} from 'lucide-react';
import '../Css/Tetris.css';
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
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'rotate') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.06);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'lock') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'clear') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.5);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const SHAPES = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: '#00f0f0',
    name: 'I'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000',
    name: 'O'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#a000f0',
    name: 'T'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: '#00f000',
    name: 'S'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: '#f00000',
    name: 'Z'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#0000f0',
    name: 'J'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: '#f0a000',
    name: 'L'
  }
};

const SHAPE_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

const createGrid = () => Array.from({ length: 20 }, () => Array(10).fill({ value: 0, color: '' }));

const Tetris = () => {
  const [grid, setGrid] = useState(createGrid);
  const [currentPiece, setCurrentPiece] = useState(null);
  const [nextPiece, setNextPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [startLevel, setStartLevel] = useState(1);
  const [highScore, setHighScore] = useState(
    localStorage.getItem('tetris_high_score') ? parseInt(localStorage.getItem('tetris_high_score')) : 0
  );

  const gameLoopRef = useRef(null);

  // Helper to generate a random piece
  const getRandomPiece = useCallback(() => {
    const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
    const blueprint = SHAPES[key];
    return {
      shape: blueprint.shape,
      color: blueprint.color,
      name: blueprint.name,
      x: 3,
      y: 0
    };
  }, []);

  // Check collision helper
  const checkCollision = useCallback((shape, xOffset, yOffset, currentGrid) => {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const targetX = xOffset + c;
          const targetY = yOffset + r;

          // Out of boundaries
          if (targetX < 0 || targetX >= 10 || targetY >= 20) {
            return true;
          }

          // Grid cell already occupied
          if (targetY >= 0 && currentGrid[targetY][targetX].value !== 0) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Hard drop action
  const hardDrop = useCallback(() => {
    if (gameOver || paused || !currentPiece) return;
    
    let currentY = currentPiece.y;
    while (!checkCollision(currentPiece.shape, currentPiece.x, currentY + 1, grid)) {
      currentY++;
    }

    playSound('lock', soundEnabled);

    // Lock piece
    const updatedGrid = grid.map(row => row.map(cell => ({ ...cell })));
    for (let r = 0; r < currentPiece.shape.length; r++) {
      for (let c = 0; c < currentPiece.shape[r].length; c++) {
        if (currentPiece.shape[r][c]) {
          const targetY = currentY + r;
          const targetX = currentPiece.x + c;
          if (targetY >= 0) {
            updatedGrid[targetY][targetX] = { value: 1, color: currentPiece.color };
          }
        }
      }
    }

    // Check full lines
    let linesClearedThisTurn = 0;
    const filteredGrid = updatedGrid.filter(row => {
      const isFull = row.every(cell => cell.value !== 0);
      if (isFull) linesClearedThisTurn++;
      return !isFull;
    });

    // Insert new empty rows at top
    while (filteredGrid.length < 20) {
      filteredGrid.unshift(Array(10).fill({ value: 0, color: '' }));
    }

    // Update Scores
    if (linesClearedThisTurn > 0) {
      playSound('clear', soundEnabled);
      const points = [0, 100, 300, 500, 800]; // single, double, triple, tetris
      const earned = points[linesClearedThisTurn] * level;
      setScore(prev => {
        const nextScore = prev + earned;
        if (nextScore > highScore) {
          localStorage.setItem('tetris_high_score', nextScore.toString());
          setHighScore(nextScore);
        }
        return nextScore;
      });
      setLines(prev => {
        const nextLines = prev + linesClearedThisTurn;
        // level increases every 10 lines, capped at 5
        const nextLevel = Math.min(5, Math.floor(nextLines / 10) + 1);
        if (nextLevel !== level) {
          setLevel(nextLevel);
        }
        return nextLines;
      });
    }

    // Spawn next piece
    const nextSpawn = nextPiece || getRandomPiece();
    const futureNext = getRandomPiece();

    if (checkCollision(nextSpawn.shape, nextSpawn.x, nextSpawn.y, filteredGrid)) {
      setGameOver(true);
      playSound('gameover', soundEnabled);
    } else {
      setCurrentPiece(nextSpawn);
      setNextPiece(futureNext);
    }
    setGrid(filteredGrid);
  }, [grid, currentPiece, nextPiece, level, highScore, soundEnabled, checkCollision, getRandomPiece]);

  // Soft drop / Tick action
  const moveDown = useCallback(() => {
    if (gameOver || paused || !currentPiece) return;

    if (!checkCollision(currentPiece.shape, currentPiece.x, currentPiece.y + 1, grid)) {
      setCurrentPiece(prev => ({ ...prev, y: prev.y + 1 }));
    } else {
      // Lock piece in place
      playSound('lock', soundEnabled);
      const updatedGrid = grid.map(row => row.map(cell => ({ ...cell })));
      for (let r = 0; r < currentPiece.shape.length; r++) {
        for (let c = 0; c < currentPiece.shape[r].length; c++) {
          if (currentPiece.shape[r][c]) {
            const targetY = currentPiece.y + r;
            const targetX = currentPiece.x + c;
            if (targetY >= 0) {
              updatedGrid[targetY][targetX] = { value: 1, color: currentPiece.color };
            }
          }
        }
      }

      // Check lines
      let linesCleared = 0;
      const filteredGrid = updatedGrid.filter(row => {
        const isFull = row.every(cell => cell.value !== 0);
        if (isFull) linesCleared++;
        return !isFull;
      });

      while (filteredGrid.length < 20) {
        filteredGrid.unshift(Array(10).fill({ value: 0, color: '' }));
      }

      if (linesCleared > 0) {
        playSound('clear', soundEnabled);
        const points = [0, 100, 300, 500, 800];
        const earned = points[linesCleared] * level;
        setScore(prev => {
          const nextScore = prev + earned;
          if (nextScore > highScore) {
            localStorage.setItem('tetris_high_score', nextScore.toString());
            setHighScore(nextScore);
          }
          return nextScore;
        });
        setLines(prev => {
          const nextLines = prev + linesCleared;
          // level capped at 5
          const nextLevel = Math.min(5, Math.floor(nextLines / 10) + 1);
          if (nextLevel !== level) {
            setLevel(nextLevel);
          }
          return nextLines;
        });
      }

      // Spawn next piece
      const nextSpawn = nextPiece || getRandomPiece();
      const futureNext = getRandomPiece();

      if (checkCollision(nextSpawn.shape, nextSpawn.x, nextSpawn.y, filteredGrid)) {
        setGameOver(true);
        playSound('gameover', soundEnabled);
      } else {
        setCurrentPiece(nextSpawn);
        setNextPiece(futureNext);
      }
      setGrid(filteredGrid);
    }
  }, [grid, currentPiece, nextPiece, level, highScore, soundEnabled, checkCollision, getRandomPiece]);

  // Horizontal shifts
  const moveHorizontal = useCallback((dir) => {
    if (gameOver || paused || !currentPiece) return;
    if (!checkCollision(currentPiece.shape, currentPiece.x + dir, currentPiece.y, grid)) {
      playSound('move', soundEnabled);
      setCurrentPiece(prev => ({ ...prev, x: prev.x + dir }));
    }
  }, [grid, currentPiece, gameOver, paused, soundEnabled, checkCollision]);

  // Rotate piece
  const rotatePiece = useCallback(() => {
    if (gameOver || paused || !currentPiece) return;

    // Rotate matrix
    const nShape = currentPiece.shape[0].map((_, idx) => 
      currentPiece.shape.map(row => row[idx]).reverse()
    );

    // Wall Kick - Try shift left/right if rotating near wall creates collision
    let kickX = 0;
    if (checkCollision(nShape, currentPiece.x, currentPiece.y, grid)) {
      if (!checkCollision(nShape, currentPiece.x - 1, currentPiece.y, grid)) kickX = -1;
      else if (!checkCollision(nShape, currentPiece.x + 1, currentPiece.y, grid)) kickX = 1;
      else if (!checkCollision(nShape, currentPiece.x - 2, currentPiece.y, grid)) kickX = -2;
      else if (!checkCollision(nShape, currentPiece.x + 2, currentPiece.y, grid)) kickX = 2;
      else return; // Can't rotate
    }

    playSound('rotate', soundEnabled);
    setCurrentPiece(prev => ({
      ...prev,
      shape: nShape,
      x: prev.x + kickX
    }));
  }, [grid, currentPiece, gameOver, paused, soundEnabled, checkCollision]);

  // Game loop interval based on level difficulty
  useEffect(() => {
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    if (hasStarted && currentPiece && !gameOver && !paused) {
      const speeds = [800, 600, 400, 250, 120];
      const speed = speeds[Math.min(level - 1, 4)];
      gameLoopRef.current = setInterval(moveDown, speed);
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [currentPiece, gameOver, paused, level, moveDown, hasStarted]);

  // Key Down Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '];
      if (gameKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (!hasStarted || gameOver || paused) return;

      switch (e.key) {
        case 'ArrowLeft':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        case ' ':
          hardDrop();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveHorizontal, moveDown, rotatePiece, hardDrop, gameOver, paused, hasStarted]);

  const initGame = () => {
    setGrid(createGrid());
    setScore(0);
    setLines(0);
    setLevel(startLevel);
    setGameOver(false);
    setPaused(false);
    setHasStarted(false);

    const first = getRandomPiece();
    const second = getRandomPiece();
    setCurrentPiece(first);
    setNextPiece(second);
  };

  const startGame = () => {
    setLevel(startLevel);
    setHasStarted(true);
    setPaused(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  return (
    <div className="tetris-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Block Stacker</span>
      </div>

      <div className="game-content-card tetris-grid">
        {/* Left Side Panel: Stats */}
        <div className="tetris-stats-panel">
          <div className="game-header text-left">
            <h1 className="game-title">Block Stacker</h1>
            <p className="game-subtitle">Neon Tetris. Complete horizontal lines of blocks.</p>
          </div>

          <div className="stats-dashboard vertical">
            <div className="stat-card">
              <Trophy className="stat-icon neon-gold" size={18} />
              <div className="stat-info">
                <span className="stat-label">High Score</span>
                <span className="stat-value">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <Zap className="stat-icon neon-blue" size={18} />
              <div className="stat-info">
                <span className="stat-label">Current Score</span>
                <span className="stat-value">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <TrendingUp className="stat-icon neon-green" size={18} />
              <div className="stat-info">
                <span className="stat-label">Level</span>
                <span className="stat-value">{level}</span>
              </div>
            </div>

            <div className="stat-card">
              <Award className="stat-icon neon-pink" size={18} />
              <div className="stat-info">
                <span className="stat-label">Lines Cleared</span>
                <span className="stat-value">{lines}</span>
              </div>
            </div>
          </div>

          {/* Sound Synth Option */}
          <button 
            className="btn btn-reset w-full justify-center mb-4" 
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* How to controls */}
          <div className="controls-help-box">
            <h3><HelpCircle size={14} /> Controls</h3>
            <ul>
              <li><strong>← / →</strong>: Move Block</li>
              <li><strong>↑ Arrow</strong>: Rotate Piece</li>
              <li><strong>↓ Arrow</strong>: Soft Drop</li>
              <li><strong>Spacebar</strong>: Hard Drop</li>
            </ul>
          </div>
        </div>

        {/* Center Grid: Playing Matrix */}
        <div className="tetris-board-container">
          <div className="tetris-matrix">
            {grid.map((row, rIdx) => (
              <div key={rIdx} className="matrix-row">
                {row.map((cell, cIdx) => {
                  // Check if cell contains the active moving piece
                  let isPieceCell = false;
                  let cellColor = cell.color;

                  if (currentPiece && !gameOver && !paused) {
                    const localY = rIdx - currentPiece.y;
                    const localX = cIdx - currentPiece.x;
                    if (
                      localY >= 0 && localY < currentPiece.shape.length &&
                      localX >= 0 && localX < currentPiece.shape[localY].length &&
                      currentPiece.shape[localY][localX]
                    ) {
                      isPieceCell = true;
                      cellColor = currentPiece.color;
                    }
                  }

                  const active = cell.value !== 0 || isPieceCell;
                  return (
                    <div 
                      key={cIdx} 
                      className={`matrix-cell ${active ? 'active-block' : ''}`}
                      style={active ? { 
                        backgroundColor: cellColor + '1a', 
                        borderColor: cellColor, 
                        boxShadow: `0 0 8px ${cellColor}4d` 
                      } : {}}
                    />
                  );
                })}
              </div>
            ))}

            {/* Overlays (Pause/Gameover) */}
            <AnimatePresence>
              {!hasStarted && (
                <motion.div 
                  className="matrix-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="overlay-modal start-modal">
                    <h2>Block Stacker</h2>
                    <p className="start-subtitle">Select Starting Level</p>
                    
                    <div className="level-select-grid">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const lvl = idx + 1;
                        return (
                          <button
                            key={lvl}
                            className={`level-btn ${startLevel === lvl ? 'active' : ''}`}
                            onClick={() => setStartLevel(lvl)}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button 
                      className="btn btn-primary mt-4 w-full justify-center" 
                      onClick={startGame}
                    >
                      <Play size={16} />
                      <span>Start Game</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {gameOver && (
                <motion.div 
                  className="matrix-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="overlay-modal">
                    <h2>Game Over</h2>
                    <p>The matrix collapsed. final Score: <strong>{score.toLocaleString()}</strong></p>
                    <button className="btn btn-primary mt-4" onClick={initGame}>Play Again</button>
                  </div>
                </motion.div>
              )}

              {paused && (
                <motion.div 
                  className="matrix-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="overlay-modal">
                    <h2>Game Paused</h2>
                    <button className="btn btn-primary mt-4" onClick={() => setPaused(false)}>Resume</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Side Panel: Next Block Preview */}
        <div className="tetris-next-panel">
          <div className="next-preview-box">
            <h3>Next Piece</h3>
            <div className="preview-grid">
              {nextPiece ? (
                // Draw next piece in a 4x4 matrix
                Array.from({ length: 4 }).map((_, rIdx) => (
                  <div key={rIdx} className="preview-row">
                    {Array.from({ length: 4 }).map((_, cIdx) => {
                      let active = false;
                      const shapeR = rIdx;
                      const shapeC = cIdx;
                      
                      if (
                        shapeR < nextPiece.shape.length &&
                        shapeC < nextPiece.shape[shapeR].length &&
                        nextPiece.shape[shapeR][shapeC]
                      ) {
                        active = true;
                      }

                      return (
                        <div 
                          key={cIdx} 
                          className={`preview-cell ${active ? 'active-preview' : ''}`}
                          style={active ? { 
                            backgroundColor: nextPiece.color + '1a', 
                            borderColor: nextPiece.color, 
                            boxShadow: `0 0 6px ${nextPiece.color}66` 
                          } : {}}
                        />
                      );
                    })}
                  </div>
                ))
              ) : (
                <HelpCircle className="preview-empty-icon" size={24} />
              )}
            </div>
          </div>

          <div className="action-buttons-column mt-8">
            <button className="btn btn-primary" onClick={() => setPaused(!paused)} disabled={gameOver || !hasStarted}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>
            <button className="btn btn-reset" onClick={initGame}>
              <RotateCcw size={16} />
              <span>Restart</span>
            </button>
          </div>
        </div>
      </div>

      <Foote />
    </div>
  );
};

export default Tetris;
