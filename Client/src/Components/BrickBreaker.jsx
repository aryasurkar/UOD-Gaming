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
  Heart,
  Volume2,
  VolumeX,
  Zap,
  Gamepad2
} from 'lucide-react';
import '../Css/BrickBreaker.css';
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
    if (type === 'paddle') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'wall') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'brick') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.35);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const BRICK_COLORS = ['#ff007f', '#ea580c', '#00d4ff', '#00ff88'];

const BrickBreaker = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Game configuration & status
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [highScore, setHighScore] = useState(
    localStorage.getItem('breakout_high_score') ? parseInt(localStorage.getItem('breakout_high_score')) : 0
  );
  const [isRunning, setIsRunning] = useState(false);

  // Mutable game physics references to avoid stale closures in requestAnimationFrame
  const gameState = useRef({
    paddle: { x: 250, width: 90, height: 12 },
    ball: { x: 300, y: 350, vx: 3, vy: -3, radius: 7, baseSpeed: 4.5 },
    bricks: [],
    keys: { left: false, right: false },
    isRunning: false,
    mouseActive: false
  });

  // Re-build bricks layout
  const buildBricks = () => {
    const cols = 8;
    const rows = 4;
    const padding = 10;
    const offsetTop = 45;
    const offsetLeft = 15;
    const brickW = 68;
    const brickH = 18;

    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          x: c * (brickW + padding) + offsetLeft,
          y: r * (brickH + padding) + offsetTop,
          w: brickW,
          h: brickH,
          color: BRICK_COLORS[r % BRICK_COLORS.length],
          active: true
        });
      }
    }
    gameState.current.bricks = list;
  };

  const resetBall = () => {
    const state = gameState.current;
    state.ball.x = state.paddle.x + state.paddle.width / 2;
    state.ball.y = 360;
    state.ball.vx = 2.5 * (Math.random() > 0.5 ? 1 : -1);
    state.ball.vy = -3.5;
    state.isRunning = false;
    setIsRunning(false);
  };

  const initGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setIsWon(false);
    setPaused(false);
    setIsRunning(false);

    gameState.current.paddle.x = 255;
    gameState.current.ball.baseSpeed = 4.5;
    buildBricks();
    resetBall();
  };

  // Setup game components
  useEffect(() => {
    initGame();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeKeys = ['ArrowLeft', 'ArrowRight', ' '];
      if (activeKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') gameState.current.keys.left = true;
      if (e.key === 'ArrowRight') gameState.current.keys.right = true;
      if (e.key === ' ' && !gameState.current.isRunning && !gameOver && !paused) {
        gameState.current.isRunning = true;
        setIsRunning(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') gameState.current.keys.left = false;
      if (e.key === 'ArrowRight') gameState.current.keys.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameOver, paused]);

  // Mouse Listener inside Canvas
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const state = gameState.current;

    state.paddle.x = Math.max(0, Math.min(600 - state.paddle.width, relativeX - state.paddle.width / 2));
    if (!state.isRunning) {
      state.ball.x = state.paddle.x + state.paddle.width / 2;
    }
  };

  const handleCanvasClick = () => {
    const state = gameState.current;
    if (!state.isRunning && !gameOver && !paused) {
      state.isRunning = true;
      setIsRunning(true);
    }
  };

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysics = () => {
      const state = gameState.current;
      if (gameOver || paused) return;

      // Move Paddle with Keyboard
      if (state.keys.left) {
        state.paddle.x = Math.max(0, state.paddle.x - 7);
      }
      if (state.keys.right) {
        state.paddle.x = Math.min(600 - state.paddle.width, state.paddle.x + 7);
      }

      if (!state.isRunning) {
        state.ball.x = state.paddle.x + state.paddle.width / 2;
        return;
      }

      // Move Ball
      const ball = state.ball;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Ball and wall collision
      if (ball.x + ball.radius > 600) {
        ball.x = 600 - ball.radius;
        ball.vx = -ball.vx;
        playSound('wall', soundEnabled);
      } else if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx;
        playSound('wall', soundEnabled);
      }

      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy;
        playSound('wall', soundEnabled);
      }

      // Ball and bottom wall (lose life)
      if (ball.y + ball.radius > 400) {
        playSound('lose', soundEnabled);
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            setGameOver(true);
          } else {
            resetBall();
          }
          return nextLives;
        });
        return;
      }

      // Ball and paddle collision
      const paddle = state.paddle;
      if (
        ball.y + ball.radius >= 370 &&
        ball.y - ball.radius <= 372 &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width
      ) {
        playSound('paddle', soundEnabled);
        
        // Dynamic bounce physics
        const relativeX = ball.x - (paddle.x + paddle.width / 2);
        const normalized = relativeX / (paddle.width / 2);
        const maxAngle = Math.PI / 3; // 60 degrees
        const angle = normalized * maxAngle;
        
        const speed = ball.baseSpeed;
        ball.vx = speed * Math.sin(angle);
        ball.vy = -speed * Math.cos(angle);
        ball.y = 370 - ball.radius; // correct position
      }

      // Ball and brick collision
      let activeBricks = 0;
      for (let i = 0; i < state.bricks.length; i++) {
        const brick = state.bricks[i];
        if (!brick.active) continue;
        activeBricks++;

        // Box collision
        if (
          ball.x + ball.radius >= brick.x &&
          ball.x - ball.radius <= brick.x + brick.w &&
          ball.y + ball.radius >= brick.y &&
          ball.y - ball.radius <= brick.y + brick.h
        ) {
          brick.active = false;
          playSound('brick', soundEnabled);
          
          // Reverse Y movement
          ball.vy = -ball.vy;

          setScore(prev => {
            const nextScore = prev + 10;
            if (nextScore > highScore) {
              localStorage.setItem('breakout_high_score', nextScore.toString());
              setHighScore(nextScore);
            }
            return nextScore;
          });
          
          activeBricks--;
          break; // only hit one brick per frame
        }
      }

      // Level Cleared
      if (activeBricks === 0 && state.bricks.length > 0) {
        playSound('win', soundEnabled);
        setLevel(prev => {
          const nextLvl = prev + 1;
          state.ball.baseSpeed += 0.5; // speed up
          buildBricks();
          resetBall();
          return nextLvl;
        });
      }
    };

    const draw = () => {
      // Clear
      ctx.clearRect(0, 0, 600, 400);

      const state = gameState.current;

      // Draw Bricks
      state.bricks.forEach(brick => {
        if (!brick.active) return;
        ctx.fillStyle = brick.color + '1a';
        ctx.strokeStyle = brick.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
        } else {
          ctx.rect(brick.x, brick.y, brick.w, brick.h);
        }
        ctx.fill();
        ctx.stroke();
      });

      // Draw Paddle
      ctx.fillStyle = '#00d4ff1a';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(state.paddle.x, 370, state.paddle.width, state.paddle.height, 6);
      } else {
        ctx.rect(state.paddle.x, 370, state.paddle.width, state.paddle.height);
      }
      ctx.fill();
      ctx.stroke();

      // Draw Ball
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
      ctx.fill();

      // Add a subtle ball glowing filter
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff88';
      ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
      ctx.shadowBlur = 0; // reset
    };

    const loop = () => {
      updatePhysics();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameOver, paused, soundEnabled, highScore]);

  return (
    <div className="bb-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Brick Breaker</span>
      </div>

      <div className="game-content-card bb-grid">
        {/* Playfield Canvas */}
        <div className="bb-canvas-panel">
          <div className="game-header text-left">
            <h1 className="game-title">Brick Breaker</h1>
            <p className="game-subtitle">Retro Breakout. Deflect the energy ball to clear the neon grid.</p>
          </div>

          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={400} 
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              className="breakout-canvas"
            />

            {!isRunning && !gameOver && !paused && (
              <div className="start-prompt-overlay" onClick={handleCanvasClick}>
                <p>Press <strong>SPACEBAR</strong> or <strong>CLICK SCREEN</strong> to Launch Ball</p>
                <span>Move your cursor or use Left/Right arrows to navigate the paddle.</span>
              </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
              {gameOver && (
                <div className="start-prompt-overlay gameover">
                  <h2>Arcade Over</h2>
                  <p>All lives lost. final score: <strong>{score.toLocaleString()}</strong></p>
                  <button className="btn btn-primary mt-4" onClick={initGame}>Insert Coin (Play)</button>
                </div>
              )}

              {paused && (
                <div className="start-prompt-overlay paused">
                  <h2>Paused</h2>
                  <button className="btn btn-primary mt-4" onClick={() => setPaused(false)}>Resume Game</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info panel */}
        <div className="bb-sidebar-panel">
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
                <span className="stat-label">Score</span>
                <span className="stat-value">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="stat-card">
              <Gamepad2 className="stat-icon neon-green" size={18} />
              <div className="stat-info">
                <span className="stat-label">Level</span>
                <span className="stat-value">{level}</span>
              </div>
            </div>
          </div>

          {/* Lives indicators */}
          <div className="lives-panel mb-6">
            <h3>Health Status</h3>
            <div className="lives-hearts">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  size={24} 
                  fill={i < lives ? '#ff007f' : 'none'} 
                  color={i < lives ? '#ff007f' : 'rgba(255, 255, 255, 0.1)'} 
                  className={i < lives ? 'active-heart animate-pulse' : ''}
                />
              ))}
            </div>
          </div>

          <div className="action-buttons-column mt-4">
            <button className="btn btn-reset mb-4" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
            
            <button className="btn btn-primary mb-4" onClick={() => setPaused(!paused)} disabled={gameOver}>
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

export default BrickBreaker;
