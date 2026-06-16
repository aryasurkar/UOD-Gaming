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
import '../Css/TowerStack.css';
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
    if (type === 'place') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'chop') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'perfect') {
      // Ascending chord sequence for perfect hits
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(55, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'restart') {
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

const NEON_COLORS = ['#ff007f', '#ea580c', '#eab308', '#00ff88', '#00d4ff', '#a855f7'];

const TowerStack = () => {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // React State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    localStorage.getItem('stack_high_score') ? parseInt(localStorage.getItem('stack_high_score')) : 0
  );
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [combo, setCombo] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Mutable Game Physics (to avoid closures inside requestAnimationFrame)
  const gameState = useRef({
    blocks: [], // { x, w, color, isPerfect }
    debris: [], // { x, y, w, color, vy, alpha }
    slidingBlock: { x: 0, w: 180, direction: 1, baseSpeed: 3.5 },
    cameraY: 0,
    targetCameraY: 0,
    perfectFlash: 0,
    perfectFlashX: 0,
    perfectFlashW: 0,
    debrisMiss: null // if missed completely
  });

  const blockHeight = 24;

  const initGame = () => {
    playSound('restart', soundEnabled);
    setScore(0);
    setCombo(0);
    setGameOver(false);
    setPaused(false);
    setGameStarted(true);

    const baseWidth = 160;
    gameState.current.blocks = [
      {
        x: (400 - baseWidth) / 2,
        w: baseWidth,
        color: NEON_COLORS[0],
        isPerfect: false
      }
    ];
    gameState.current.debris = [];
    gameState.current.slidingBlock = {
      x: -baseWidth,
      w: baseWidth,
      direction: 1,
      baseSpeed: 3.5
    };
    gameState.current.cameraY = 0;
    gameState.current.targetCameraY = 0;
    gameState.current.perfectFlash = 0;
    gameState.current.debrisMiss = null;
  };

  // Keyboard Spacebar listener to place block
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (gameStarted && !gameOver && !paused) {
          dropBlock();
        } else if (!gameStarted) {
          initGame();
        } else if (gameOver) {
          initGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameStarted, gameOver, paused, soundEnabled]);

  const dropBlock = () => {
    const state = gameState.current;
    const stack = state.blocks;
    const topBlock = stack[stack.length - 1];
    const curr = state.slidingBlock;

    const topBlockY = 500 - stack.length * blockHeight + state.cameraY;
    const currentBlockY = topBlockY - blockHeight;

    // Check overlap boundaries
    const diff = curr.x - topBlock.x;
    const perfectThreshold = 5; // allow 5px tolerance

    if (Math.abs(diff) <= perfectThreshold) {
      // PERFECT DROP!
      const newX = topBlock.x;
      const newW = topBlock.w;

      // Add block
      stack.push({
        x: newX,
        w: newW,
        color: NEON_COLORS[stack.length % NEON_COLORS.length],
        isPerfect: true
      });

      // Score and combos
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      playSound('perfect', soundEnabled);

      // Flash animation trigger
      state.perfectFlash = 1.0;
      state.perfectFlashX = newX;
      state.perfectFlashW = newW;

      // Every 5 consecutive combos, reward the player by expanding the block size slightly
      let rewardedWidth = newW;
      let rewardedX = newX;
      if (nextCombo > 0 && nextCombo % 5 === 0) {
        rewardedWidth = Math.min(220, newW + 12);
        rewardedX = Math.max(10, newX - 6);
        // Update top block to reflect expansion
        stack[stack.length - 1].w = rewardedWidth;
        stack[stack.length - 1].x = rewardedX;
      }

      // Prepare next sliding block
      const nextDir = Math.random() > 0.5 ? 1 : -1;
      state.slidingBlock = {
        x: nextDir === 1 ? -rewardedWidth : 400,
        w: rewardedWidth,
        direction: nextDir,
        baseSpeed: curr.baseSpeed
      };

      setScore(prev => {
        const nextScore = prev + 1;
        if (nextScore > highScore) {
          localStorage.setItem('stack_high_score', nextScore.toString());
          setHighScore(nextScore);
        }
        return nextScore;
      });

      // Update camera height
      state.targetCameraY = Math.max(0, (stack.length - 8) * blockHeight);

    } else {
      // Overlap calculation
      const left = Math.max(curr.x, topBlock.x);
      const right = Math.min(curr.x + curr.w, topBlock.x + topBlock.w);
      const overlapWidth = right - left;

      if (overlapWidth <= 0) {
        // MISS COMPLETELY!
        playSound('lose', soundEnabled);
        state.debrisMiss = {
          x: curr.x,
          y: currentBlockY - state.cameraY,
          w: curr.w,
          vy: 0,
          alpha: 1.0,
          color: NEON_COLORS[stack.length % NEON_COLORS.length]
        };
        setGameOver(true);
        setCombo(0);
      } else {
        // PLACED WITH CUT
        setCombo(0);
        playSound('chop', soundEnabled);

        // Debris generation (the cut-off section)
        let debrisX = 0;
        let debrisWidth = 0;

        if (curr.x < topBlock.x) {
          // hanging off the left side
          debrisX = curr.x;
          debrisWidth = topBlock.x - curr.x;
        } else {
          // hanging off the right side
          debrisX = topBlock.x + topBlock.w;
          debrisWidth = (curr.x + curr.w) - (topBlock.x + topBlock.w);
        }

        if (debrisWidth > 0) {
          state.debris.push({
            x: debrisX,
            y: currentBlockY - state.cameraY, // store relative to stack coordinates
            w: debrisWidth,
            vy: 0,
            alpha: 1.0,
            color: NEON_COLORS[stack.length % NEON_COLORS.length]
          });
        }

        // Add overlapping block to stack
        stack.push({
          x: left,
          w: overlapWidth,
          color: NEON_COLORS[stack.length % NEON_COLORS.length],
          isPerfect: false
        });

        // Prepare next block
        const nextDir = Math.random() > 0.5 ? 1 : -1;
        state.slidingBlock = {
          x: nextDir === 1 ? -overlapWidth : 400,
          w: overlapWidth,
          direction: nextDir,
          baseSpeed: curr.baseSpeed
        };

        setScore(prev => {
          const nextScore = prev + 1;
          if (nextScore > highScore) {
            localStorage.setItem('stack_high_score', nextScore.toString());
            setHighScore(nextScore);
          }
          return nextScore;
        });

        // Update camera height
        state.targetCameraY = Math.max(0, (stack.length - 8) * blockHeight);
      }
    }
  };

  // Main game logic loops
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const update = () => {
      const state = gameState.current;
      if (!gameStarted || gameOver || paused) return;

      // 1. Move camera smoothly
      state.cameraY += (state.targetCameraY - state.cameraY) * 0.1;

      // 2. Move sliding block
      const curr = state.slidingBlock;
      // Speed scales up slightly with score
      const speed = curr.baseSpeed + score * 0.12;
      curr.x += speed * curr.direction;

      // Reverse horizontal directions at limits
      if (curr.direction === 1 && curr.x >= 400) {
        curr.direction = -1;
      } else if (curr.direction === -1 && curr.x <= -curr.w) {
        curr.direction = 1;
      }

      // 3. Update debris particles falling
      for (let i = state.debris.length - 1; i >= 0; i--) {
        const d = state.debris[i];
        d.vy += 0.35; // gravity
        d.y += d.vy;
        d.alpha -= 0.02; // fade
        if (d.alpha <= 0 || d.y > 600) {
          state.debris.splice(i, 1);
        }
      }

      // 4. Update perfect flash duration
      if (state.perfectFlash > 0) {
        state.perfectFlash -= 0.05;
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, 400, 500);

      const state = gameState.current;

      // Render Stack Blocks
      state.blocks.forEach((block, index) => {
        const y = 500 - (index + 1) * blockHeight + state.cameraY;
        if (y > 550) return; // offscreen bottom

        ctx.fillStyle = block.color + '1c';
        ctx.strokeStyle = block.color;
        ctx.lineWidth = 3;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(block.x, y, block.w, blockHeight, 4);
        } else {
          ctx.rect(block.x, y, block.w, blockHeight);
        }
        ctx.fill();
        ctx.stroke();

        // If it was a perfect fit, draw a subtle glowing pulse
        if (block.isPerfect) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Render Debris
      state.debris.forEach(d => {
        const y = d.y + state.cameraY;
        ctx.fillStyle = d.color;
        ctx.globalAlpha = d.alpha;
        ctx.beginPath();
        ctx.rect(d.x, y, d.w, blockHeight);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // reset

      // Render sliding block if game is active
      if (gameStarted && !gameOver && !paused) {
        const stackLength = state.blocks.length;
        const y = 500 - (stackLength + 1) * blockHeight + state.cameraY;
        const color = NEON_COLORS[stackLength % NEON_COLORS.length];

        ctx.fillStyle = color + '2a';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(state.slidingBlock.x, y, state.slidingBlock.w, blockHeight, 4);
        } else {
          ctx.rect(state.slidingBlock.x, y, state.slidingBlock.w, blockHeight);
        }
        ctx.fill();
        ctx.stroke();
      }

      // Render complete miss falling debris
      if (gameOver && state.debrisMiss) {
        const d = state.debrisMiss;
        d.vy += 0.35;
        d.y += d.vy;
        d.alpha -= 0.025;

        ctx.fillStyle = d.color;
        ctx.globalAlpha = Math.max(0, d.alpha);
        ctx.beginPath();
        ctx.rect(d.x, d.y + state.cameraY, d.w, blockHeight);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Perfect Hit Flash Overlay
      if (state.perfectFlash > 0) {
        const flashY = 500 - state.blocks.length * blockHeight + state.cameraY;
        ctx.strokeStyle = `rgba(255, 255, 255, ${state.perfectFlash})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(state.perfectFlashX, flashY, state.perfectFlashW, blockHeight, 4);
        } else {
          ctx.rect(state.perfectFlashX, flashY, state.perfectFlashW, blockHeight);
        }
        ctx.stroke();

        // Floating 'PERFECT!' text
        ctx.fillStyle = `rgba(255, 255, 255, ${state.perfectFlash})`;
        ctx.font = '700 1.2rem var(--font-gaming)';
        ctx.textAlign = 'center';
        ctx.fillText('PERFECT!', 200, flashY - 20);
      }
    };

    const loop = () => {
      update();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameStarted, gameOver, paused, score, soundEnabled]);

  return (
    <div className="stack-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Tower Stack</span>
      </div>

      <div className="game-content-card stack-grid">
        {/* Playfield Canvas */}
        <div className="stack-canvas-panel">
          <div className="game-header text-left">
            <h1 className="game-title">Neon Stack Tower</h1>
            <p className="game-subtitle">Tap Space or click the canvas to drop sliding blocks. Align carefully to stack them high.</p>
          </div>

          <div className="canvas-wrapper-stack">
            <canvas 
              ref={canvasRef} 
              width={400} 
              height={500} 
              onClick={dropBlock}
              className="stack-canvas"
            />

            {!gameStarted && (
              <div className="start-prompt-overlay" onClick={initGame}>
                <Gamepad2 className="mb-4 text-purple-400" size={48} />
                <p>Press <strong>SPACEBAR</strong> or <strong>CLICK HERE</strong> to Play</p>
                <span>Perfect drops lock size and build combos. Every 5 combos expands the block width!</span>
              </div>
            )}

            {/* Overlays */}
            <AnimatePresence>
              {gameOver && (
                <div className="start-prompt-overlay gameover">
                  <h2>Tower Collapsed</h2>
                  <p>Final blocks stacked: <strong>{score}</strong></p>
                  {combo > 0 && <span className="mb-4">Streak combos: {combo}</span>}
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
        <div className="stack-sidebar-panel">
          <div className="stats-dashboard vertical">
            <div className="stat-card">
              <Trophy className="stat-icon neon-gold" size={18} />
              <div className="stat-info">
                <span className="stat-label">High Score</span>
                <span className="stat-value">{highScore}</span>
              </div>
            </div>

            <div className="stat-card">
              <Zap className="stat-icon neon-blue" size={18} />
              <div className="stat-info">
                <span className="stat-label">Tower Score</span>
                <span className="stat-value">{score}</span>
              </div>
            </div>

            <div className="stat-card">
              <Gamepad2 className="stat-icon neon-green" size={18} />
              <div className="stat-info">
                <span className="stat-label">Combos</span>
                <span className="stat-value">{combo}</span>
              </div>
            </div>
          </div>

          {/* Combos Indicator Banner */}
          {combo > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="combo-alert-panel"
            >
              <h3>Combo Multiplier</h3>
              <p>{combo}x Perfect Fits</p>
              {combo >= 5 && <span className="bonus-note">Bonus: Block Width Expanded!</span>}
            </motion.div>
          )}

          <div className="action-buttons-column mt-4">
            <button className="btn btn-reset mb-4" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>Sound: {soundEnabled ? 'ON' : 'OFF'}</span>
            </button>
            
            <button className="btn btn-primary mb-4" onClick={() => setPaused(!paused)} disabled={gameOver || !gameStarted}>
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

export default TowerStack;
