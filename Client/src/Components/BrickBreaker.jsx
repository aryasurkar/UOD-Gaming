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
  Heart,
  Volume2,
  VolumeX,
  Zap,
  Gamepad2
} from 'lucide-react';
import '../Css/BrickBreaker.css';

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
  const [gameId, setGameId] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting', 'submitted', 'failed', 'offline'

  useEffect(() => {
    axios.get('/api/v1/games')
      .then(res => {
        const game = res.data.games?.find(g => g.title === "Neon Brick Breaker");
        if (game) setGameId(game._id);
      })
      .catch(err => console.error("Failed to load game info:", err));
  }, []);

  useEffect(() => {
    if (gameOver) {
      const token = localStorage.getItem('token');
      if (gameId && token && score > 0) {
        setSubmitStatus('submitting');
        axios.post(`/api/v1/games/${gameId}/score`, {
          score: score,
          level: level
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
    }
  }, [gameOver, gameId, score, level]);

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
    setRewards(null);
    setSubmitStatus('');
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

  const isGameplayActive = hasStarted && !gameOver && !paused;

  return (
    <div className="bb-page-wrapper">
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
              <span className="game-hud-label">Score</span>
              <span className="game-hud-value">{score.toLocaleString()}</span>
            </div>

            <div className="game-hud-item" style={{ flexDirection: 'row', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="game-hud-label">Level</span>
                <span className="game-hud-value" style={{ color: 'var(--primary-neon)' }}>{level}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="game-hud-label">Shields</span>
                <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                  {[...Array(3)].map((_, i) => (
                    <Heart 
                      key={i} 
                      size={14} 
                      fill={i < lives ? '#ff007f' : 'none'} 
                      color={i < lives ? '#ff007f' : 'rgba(255, 255, 255, 0.2)'} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="game-hud-item">
              <span className="game-hud-label">Best</span>
              <span className="game-hud-value" style={{ color: 'var(--accent-yellow)', textShadow: '0 0 8px rgba(255,255,0,0.4)' }}>{highScore.toLocaleString()}</span>
            </div>
          </div>

          <div className="game-play-area">
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
                    <p>All lives lost. Final score: <strong>{score.toLocaleString()}</strong></p>
                    
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
        </div>

        {/* Action Controls */}
        <div className="bb-controls" style={{ display: 'flex', gap: '15px', marginTop: '10px', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => setPaused(!paused)} disabled={gameOver}>
            {paused ? <Play size={16} /> : <Pause size={16} />}
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button className="btn btn-reset" onClick={initGame}>
            <RotateCcw size={16} />
            <span>Restart</span>
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

export default BrickBreaker;
