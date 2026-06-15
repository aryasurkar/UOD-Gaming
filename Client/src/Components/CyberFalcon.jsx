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
  TrendingUp
} from 'lucide-react';
import '../Css/CyberFalcon.css';
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
    if (type === 'thrust') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'point') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'crash') {
      // Noise-like explosion rumble
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const CyberFalcon = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // States
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [highScore, setHighScore] = useState(
    localStorage.getItem('falcon_high_score') ? parseInt(localStorage.getItem('falcon_high_score')) : 0
  );

  // Physics Ref
  const physicsState = useRef({
    ship: { x: 80, y: 180, vy: 0, radius: 12, gravity: 0.28, lift: -5.2 },
    obstacles: [],
    particles: [],
    frame: 0,
    isRunning: false,
    speed: 3.2,
    gap: 120
  });

  const resetGame = () => {
    setScore(0);
    setGameOver(false);
    setPaused(false);
    setHasStarted(false);

    const state = physicsState.current;
    state.ship.y = 180;
    state.ship.vy = 0;
    state.obstacles = [];
    state.particles = [];
    state.frame = 0;
    state.isRunning = false;
    state.speed = 3.2;
    state.gap = 120;
  };

  useEffect(() => {
    resetGame();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Jump control
  const triggerThrust = () => {
    const state = physicsState.current;
    if (gameOver || paused) return;

    if (!state.isRunning) {
      state.isRunning = true;
      setHasStarted(true);
    }

    playSound('thrust', soundEnabled);
    state.ship.vy = state.ship.lift;

    // Spawn sparks
    for (let i = 0; i < 6; i++) {
      state.particles.push({
        x: state.ship.x - 12,
        y: state.ship.y,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 3,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff007f' : '#00d4ff',
        size: 2 + Math.random() * 3
      });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        triggerThrust();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, paused, soundEnabled]);

  // Main Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysics = () => {
      const state = physicsState.current;
      if (!state.isRunning || gameOver || paused) return;

      state.frame++;

      // Ship gravity
      state.ship.vy += state.ship.gravity;
      state.ship.y += state.ship.vy;

      // Wall bounds checks
      if (state.ship.y + state.ship.radius > 400) {
        state.ship.y = 400 - state.ship.radius;
        playSound('crash', soundEnabled);
        setGameOver(true);
      }
      if (state.ship.y - state.ship.radius < 0) {
        state.ship.y = state.ship.radius;
        state.ship.vy = 0;
      }

      // Move Exhaust Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
      });
      state.particles = state.particles.filter(p => p.alpha > 0);

      // Scroll Obstacles
      state.obstacles.forEach(obs => {
        obs.x -= state.speed;

        // Check passing for score
        if (!obs.passed && obs.x + obs.width < state.ship.x) {
          obs.passed = true;
          playSound('point', soundEnabled);
          setScore(prev => {
            const nextScore = prev + 1;
            if (nextScore > highScore) {
              localStorage.setItem('falcon_high_score', nextScore.toString());
              setHighScore(nextScore);
            }
            return nextScore;
          });

          // Increase speed slightly
          if (state.speed < 6) {
            state.speed += 0.08;
          }
        }
      });

      // Filter off-screen obstacles
      state.obstacles = state.obstacles.filter(obs => obs.x + obs.width > 0);

      // Spawn new obstacles every 100 frames
      if (state.frame % 100 === 0) {
        const obsWidth = 55;
        const minHeight = 40;
        const maxHeight = 400 - state.gap - minHeight;
        const topHeight = Math.floor(minHeight + Math.random() * (maxHeight - minHeight));
        const bottomHeight = 400 - state.gap - topHeight;

        state.obstacles.push({
          x: 600,
          width: obsWidth,
          top: topHeight,
          bottom: bottomHeight,
          passed: false
        });
      }

      // Collision checks with pillars
      const ship = state.ship;
      for (let i = 0; i < state.obstacles.length; i++) {
        const obs = state.obstacles[i];
        
        // Horizontal overlap check
        if (ship.x + ship.radius > obs.x && ship.x - ship.radius < obs.x + obs.width) {
          // Vertical overlap check with top or bottom pillar
          if (
            ship.y - ship.radius < obs.top ||
            ship.y + ship.radius > 400 - obs.bottom
          ) {
            playSound('crash', soundEnabled);
            setGameOver(true);
            break;
          }
        }
      }
    };

    const draw = () => {
      // Background clear
      ctx.clearRect(0, 0, 600, 400);

      const state = physicsState.current;

      // Draw exhaust particles
      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset

      // Draw obstacles
      state.obstacles.forEach(obs => {
        ctx.fillStyle = 'rgba(255, 0, 127, 0.1)';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3;

        // Top Pillar
        ctx.beginPath();
        ctx.roundRect(obs.x, -10, obs.width, obs.top + 10, [0, 0, 6, 6]);
        ctx.fill();
        ctx.stroke();

        // Bottom Pillar
        ctx.beginPath();
        ctx.roundRect(obs.x, 400 - obs.bottom, obs.width, obs.bottom + 10, [6, 6, 0, 0]);
        ctx.fill();
        ctx.stroke();
      });

      // Draw Ship (Cyber Falcon)
      ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Draw a sleek futuristic triangle ship pointing right
      const sy = state.ship.y;
      const sx = state.ship.x;
      const sr = state.ship.radius;

      ctx.moveTo(sx + sr + 4, sy); // nose
      ctx.lineTo(sx - sr, sy - sr + 2); // top back
      ctx.lineTo(sx - sr + 4, sy); // back indent
      ctx.lineTo(sx - sr, sy + sr - 2); // bottom back
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Exhaust glow indicator
      ctx.fillStyle = '#ff007f';
      ctx.beginPath();
      ctx.arc(sx - sr, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Glowing effects
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00d4ff';
      ctx.stroke();
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
    <div className="falcon-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Cyber Falcon</span>
      </div>

      <div className="game-content-card falcon-grid">
        {/* Playfield Canvas */}
        <div className="falcon-canvas-panel">
          <div className="game-header text-left">
            <h1 className="game-title">Cyber Falcon</h1>
            <p className="game-subtitle">Jetpack Avoider. Defy gravity, dodge laser walls, and survive the digital tunnel.</p>
          </div>

          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={400} 
              onClick={triggerThrust}
              className="falcon-canvas"
            />

            {!hasStarted && !gameOver && !paused && (
              <div className="start-prompt-overlay" onClick={triggerThrust}>
                <p>Press <strong>SPACEBAR</strong> or <strong>CLICK SCREEN</strong> to Engage Thrusters</p>
                <span>Tap repeatedly to hover the Falcon through the gap of neon pillars.</span>
              </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
              {gameOver && (
                <div className="start-prompt-overlay gameover">
                  <h2>System Crash</h2>
                  <p>Collision detected. distance traveled: <strong>{score} nodes</strong></p>
                  <button className="btn btn-primary mt-4" onClick={resetGame}>Re-Launch Simulation</button>
                </div>
              )}

              {paused && (
                <div className="start-prompt-overlay paused">
                  <h2>Simulation Paused</h2>
                  <button className="btn btn-primary mt-4" onClick={() => setPaused(false)}>Resume</button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="falcon-sidebar-panel">
          <div className="stats-dashboard vertical">
            <div className="stat-card">
              <Trophy className="stat-icon neon-gold" size={18} />
              <div className="stat-info">
                <span className="stat-label">High Record</span>
                <span className="stat-value">{highScore} nodes</span>
              </div>
            </div>

            <div className="stat-card">
              <Zap className="stat-icon neon-blue" size={18} />
              <div className="stat-info">
                <span className="stat-label">Distance</span>
                <span className="stat-value">{score} nodes</span>
              </div>
            </div>
          </div>

          <div className="action-buttons-column mt-8">
            <button className="btn btn-reset mb-4" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
            
            <button className="btn btn-primary mb-4" onClick={() => setPaused(!paused)} disabled={gameOver}>
              {paused ? <Play size={16} /> : <Pause size={16} />}
              <span>{paused ? 'Resume' : 'Pause'}</span>
            </button>

            <button className="btn btn-reset" onClick={resetGame}>
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

export default CyberFalcon;
