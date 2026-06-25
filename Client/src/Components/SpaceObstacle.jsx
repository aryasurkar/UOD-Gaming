import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import '../Css/SpaceObstacle.css';

// Web Audio API Synth
const playSound = (type, muted = false) => {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(100, now);
      osc2.frequency.exponentialRampToValueAtTime(20, now + 0.5);
      osc2.connect(gain);
      osc2.start(now);
      osc2.stop(now + 0.5);
      
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Audio Context init failed:", e);
  }
};

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

const SpaceObstacle = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('space_obstacle_high_score') || '0', 10));
  const [gameState, setGameState] = useState('LOBBY'); // LOBBY, GAMEPLAY, GAMEOVER
  const [menuIndex, setMenuIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  // Game Refs (mutated in animation frame)
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(score);
  const mutedRef = useRef(muted);
  const keysRef = useRef({ left: false, right: false });

  const lastTimeRef = useRef(0);
  const requestRef = useRef(null);
  const screenShakeRef = useRef(0);
  
  // Game Entities
  const playerRef = useRef({ x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 80, width: 30, height: 40, vx: 0, speed: 400 });
  const asteroidsRef = useRef([]);
  const starsRef = useRef([]);
  const particlesRef = useRef([]);
  
  const difficultyRef = useRef({ baseMulti: 1, speedMultiplier: 1, baseSpawn: 1200, spawnRate: 1500, lastSpawn: 0 });
  const currentDifficultyRef = useRef(1); // 0=Easy, 1=Medium, 2=Hard

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const initAudio = () => {
    playSound('init', true);
  };

  // Starfield initialization
  const initStars = () => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 50 + 20,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
    starsRef.current = stars;
  };

  useEffect(() => {
    initStars();
  }, []);

  const spawnAsteroid = () => {
    const size = Math.random() * 30 + 20; // 20 to 50
    const x = Math.random() * (CANVAS_WIDTH - size * 2) + size;
    const baseSpeed = 150;
    const speed = (baseSpeed + Math.random() * 100) * difficultyRef.current.speedMultiplier;
    
    // Generate a jagged polygon shape
    const points = [];
    const numPoints = Math.floor(Math.random() * 5) + 5; // 5 to 9 points
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.3);
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }

    asteroidsRef.current.push({
      x,
      y: -size,
      size,
      speed,
      points,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 2 // radians per second
    });
  };

  const spawnParticles = (x, y, color) => {
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 300,
        vy: (Math.random() - 0.5) * 300,
        life: 1.0,
        color
      });
    }
  };

  const startGame = () => {
    setScore(0);
    setGameState('GAMEPLAY');
    setMenuIndex(0);
    initAudio();
    
    playerRef.current.x = CANVAS_WIDTH / 2;
    playerRef.current.vx = 0;
    asteroidsRef.current = [];
    particlesRef.current = [];
    
    let baseMulti = 1.0;
    let baseSpawn = 1200;
    if (currentDifficultyRef.current === 0) {
      baseMulti = 0.8;
      baseSpawn = 1500;
    } else if (currentDifficultyRef.current === 2) {
      baseMulti = 1.4;
      baseSpawn = 800;
    }

    difficultyRef.current = { 
      baseMulti,
      speedMultiplier: baseMulti, 
      baseSpawn,
      spawnRate: baseSpawn, 
      lastSpawn: performance.now() 
    };
    lastTimeRef.current = performance.now();
  };

  const gameOver = () => {
    setGameState('GAMEOVER');
    playSound('crash', mutedRef.current);
    screenShakeRef.current = 20;
    
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    // Submit score
    if (scoreRef.current > highScore) {
      localStorage.setItem('space_obstacle_high_score', scoreRef.current.toString());
      setHighScore(scoreRef.current);
    }
    
    axios.post('http://localhost:5000/api/games/update', {
      gameName: 'Space Obstacle',
      score: scoreRef.current
    }).catch(err => console.error("Score submit error", err));
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeStates = ['LOBBY', 'GAMEOVER', 'GAMEPLAY', 'PAUSE'];
      if (!activeStates.includes(gameStateRef.current)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      const curState = gameStateRef.current;
      if (curState === 'GAMEPLAY') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
        if (e.code === 'Escape' || e.code === 'KeyP') {
          setGameState('PAUSE');
          setMenuIndex(0);
        }
      } else if (curState === 'PAUSE') {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          setGameState('GAMEPLAY');
        } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          playSound('click', mutedRef.current);
          setMenuIndex(prev => (prev > 0 ? prev - 1 : 2));
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          playSound('click', mutedRef.current);
          setMenuIndex(prev => (prev < 2 ? prev + 1 : 0));
        } else if (e.code === 'Space' || e.code === 'Enter') {
          playSound('click', mutedRef.current);
          if (menuIndex === 0) setGameState('GAMEPLAY');
          else if (menuIndex === 1) startGame();
          else setGameState('LOBBY');
        }
      } else if (curState === 'LOBBY') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW') {
          playSound('click', mutedRef.current);
          setMenuIndex(prev => (prev > 0 ? prev - 1 : 2));
        } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          playSound('click', mutedRef.current);
          setMenuIndex(prev => (prev < 2 ? prev + 1 : 0));
        } else if (e.code === 'Space' || e.code === 'Enter') {
          playSound('click', mutedRef.current);
          currentDifficultyRef.current = menuIndex;
          startGame();
        }
      } else if (curState === 'GAMEOVER') {
        if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'ArrowDown' || e.code === 'KeyS') {
          playSound('click', mutedRef.current);
          setMenuIndex(prev => (prev === 0 ? 1 : 0));
        } else if (e.code === 'Space' || e.code === 'Enter') {
          playSound('click', mutedRef.current);
          if (menuIndex === 0) startGame();
          else setGameState('LOBBY');
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [menuIndex]);

  // Click
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    initAudio();
    if (gameStateRef.current === 'LOBBY') {
      if (clickX >= 150 && clickX <= 450) {
        if (clickY >= 344 && clickY <= 380) {
          currentDifficultyRef.current = 0;
          playSound('click', mutedRef.current);
          startGame();
        } else if (clickY >= 399 && clickY <= 435) {
          currentDifficultyRef.current = 1;
          playSound('click', mutedRef.current);
          startGame();
        } else if (clickY >= 454 && clickY <= 490) {
          currentDifficultyRef.current = 2;
          playSound('click', mutedRef.current);
          startGame();
        }
      }
    } else if (gameStateRef.current === 'PAUSE') {
      if (clickX >= 150 && clickX <= 450 && clickY >= 374 && clickY <= 410) {
        playSound('click', mutedRef.current);
        setGameState('GAMEPLAY');
      } else if (clickX >= 150 && clickX <= 450 && clickY >= 429 && clickY <= 465) {
        playSound('click', mutedRef.current);
        startGame();
      } else if (clickX >= 150 && clickX <= 450 && clickY >= 484 && clickY <= 520) {
        playSound('click', mutedRef.current);
        setGameState('LOBBY');
      }
    } else if (gameStateRef.current === 'GAMEOVER') {
      if (clickX >= 150 && clickX <= 450 && clickY >= 434 && clickY <= 470) {
        playSound('click', mutedRef.current);
        startGame();
      } else if (clickX >= 150 && clickX <= 450 && clickY >= 489 && clickY <= 525) {
        playSound('click', mutedRef.current);
        setGameState('LOBBY');
      }
    }
  };

  // Mobile Touch Controls
  const handleTouchStart = (e) => {
    if (gameStateRef.current !== 'GAMEPLAY') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    if (touchX < rect.width / 2) {
      keysRef.current.left = true;
      keysRef.current.right = false;
    } else {
      keysRef.current.right = true;
      keysRef.current.left = false;
    }
  };

  const handleTouchEnd = () => {
    keysRef.current.left = false;
    keysRef.current.right = false;
  };

  // Main Loop
  useEffect(() => {
    const render = (time) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      const dt = (time - (lastTimeRef.current || time)) / 1000;
      lastTimeRef.current = time;

      ctx.save();

      // Screen Shake
      if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }

      // Draw Background
      ctx.fillStyle = '#020106';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Update and Draw Stars
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach(star => {
        if (gameStateRef.current === 'GAMEPLAY') {
          // Speed up stars based on difficulty
          star.y += star.speed * dt * (1 + (difficultyRef.current.speedMultiplier - 1) * 2);
        } else {
          star.y += star.speed * dt * 0.2; // Slow idle scroll
        }

        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }

        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      if (gameStateRef.current === 'GAMEPLAY') {
        const player = playerRef.current;
        const diff = difficultyRef.current;

        // Player Movement
        if (keysRef.current.left) player.vx -= 1500 * dt;
        else if (keysRef.current.right) player.vx += 1500 * dt;
        else player.vx *= 0.85; // Friction

        // Limit speed
        if (player.vx > player.speed) player.vx = player.speed;
        if (player.vx < -player.speed) player.vx = -player.speed;

        player.x += player.vx * dt;

        // Screen bounds
        if (player.x - player.width / 2 < 0) {
          player.x = player.width / 2;
          player.vx = 0;
        }
        if (player.x + player.width / 2 > CANVAS_WIDTH) {
          player.x = CANVAS_WIDTH - player.width / 2;
          player.vx = 0;
        }

        // Score tracking
        setScore(prev => prev + 1);

        // Difficulty scaling
        diff.speedMultiplier = diff.baseMulti + (scoreRef.current / 5000);
        diff.spawnRate = Math.max(400, diff.baseSpawn - (scoreRef.current / 10));

        // Spawning
        if (time - diff.lastSpawn > diff.spawnRate) {
          spawnAsteroid();
          diff.lastSpawn = time;
        }

        // Update Asteroids
        for (let i = asteroidsRef.current.length - 1; i >= 0; i--) {
          const ast = asteroidsRef.current[i];
          ast.y += ast.speed * dt;
          ast.rotation += ast.rotSpeed * dt;

          // Collision Detection (Circle vs Circle approximation)
          const dx = player.x - ast.x;
          // Player visual center is slightly lower than y
          const dy = (player.y + 10) - ast.y; 
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < ast.size + (player.width / 2) - 5) {
            // CRASH!
            spawnParticles(player.x, player.y, '#00d4ff');
            spawnParticles(ast.x, ast.y, '#ea580c');
            gameOver();
            break;
          }

          if (ast.y - ast.size > CANVAS_HEIGHT) {
            asteroidsRef.current.splice(i, 1);
          }
        }
      }

      // Draw Particles
      particlesRef.current.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= 1.0 * dt;

        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Draw Asteroids
      asteroidsRef.current.forEach(ast => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);
        
        ctx.beginPath();
        ctx.moveTo(ast.points[0].x, ast.points[0].y);
        for (let i = 1; i < ast.points.length; i++) {
          ctx.lineTo(ast.points[i].x, ast.points[i].y);
        }
        ctx.closePath();
        
        ctx.strokeStyle = '#ea580c'; // Neon Orange
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ea580c';
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(234, 88, 12, 0.1)';
        ctx.fill();
        ctx.restore();
      });

      // Draw Player (Only if not game over immediately, or draw explosion)
      if (gameStateRef.current !== 'GAMEOVER' || screenShakeRef.current === 0) {
        const player = playerRef.current;
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // Tilt based on velocity
        const tilt = (player.vx / player.speed) * 0.3;
        ctx.rotate(tilt);

        // Thruster
        ctx.beginPath();
        ctx.moveTo(-10, 15);
        ctx.lineTo(0, 15 + Math.random() * 20 + 10);
        ctx.lineTo(10, 15);
        ctx.closePath();
        ctx.fillStyle = '#00d4ff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.fill();

        // Ship Body (Neon Triangle)
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2); // Nose
        ctx.lineTo(-player.width / 2, player.height / 2); // Bottom Left
        ctx.lineTo(player.width / 2, player.height / 2); // Bottom Right
        ctx.closePath();
        
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        ctx.fillStyle = '#050508';
        ctx.fill();
        
        ctx.restore();
      }

      ctx.restore();

      // UI Overlays
      if (gameStateRef.current === 'LOBBY') {
        ctx.fillStyle = 'rgba(2, 1, 6, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 48px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE OBSTACLE', CANVAS_WIDTH / 2, 250);

        // Action Options
        const lobbyItems = ['EASY', 'MEDIUM', 'HARD'];
        lobbyItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 370 + idx * 55;

          ctx.textAlign = 'center';
          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0f0';
            ctx.strokeStyle = '#00f0f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - 130, y - 26, 260, 36);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '15px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_WIDTH / 2, y);
        });

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.fillText('USE LEFT/RIGHT ARROWS OR TOUCH SIDES TO STEER', CANVAS_WIDTH / 2, 580);
      } else if (gameStateRef.current === 'PAUSE') {
        ctx.fillStyle = 'rgba(2, 1, 6, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 48px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 250);

        // Action Options
        const pauseItems = ['RESUME', 'RESTART', 'QUIT TO MENU'];
        pauseItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 400 + idx * 55;

          ctx.textAlign = 'center';
          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0f0';
            ctx.strokeStyle = '#00f0f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - 130, y - 26, 260, 36);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '15px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_WIDTH / 2, y);
        });
      } else if (gameStateRef.current === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(2, 1, 6, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 48px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 250);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 20px "Orbitron", monospace';
        ctx.fillText(`CURRENT SCORE: ${scoreRef.current}`, CANVAS_WIDTH / 2, 310);

        ctx.fillStyle = '#00ff88';
        ctx.fillText(`BEST SCORE: ${highScore}`, CANVAS_WIDTH / 2, 340);

        // Action Options
        const gameOverItems = ['PLAY AGAIN', 'QUIT TO MENU'];
        gameOverItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 460 + idx * 55;

          ctx.textAlign = 'center';
          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00f0f0';
            ctx.strokeStyle = '#00f0f0';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_WIDTH / 2 - 130, y - 26, 260, 36);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '15px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_WIDTH / 2, y);
        });
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [highScore, menuIndex]);

  return (
    <div className="spaceobstacle-page-wrapper">
      {gameState === 'LOBBY' || gameState === 'GAMEOVER' || gameState === 'PAUSE' ? (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      ) : null}

      <motion.div 
        className="spaceobstacle-container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="spaceobstacle-header">
          <h1 className="so-title">SPACE OBSTACLE</h1>
          <div className="so-stats">
            <div className="so-stat-item"><span>DISTANCE</span>{score}</div>
            <div className="so-stat-item"><span>BEST</span>{highScore}</div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="spaceobstacle-canvas"
          style={{ display: 'block', background: '#020106', width: '100%', height: 'auto', maxWidth: '850px' }}
          onClick={handleCanvasClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        

      </motion.div>
    </div>
  );
};

export default SpaceObstacle;
