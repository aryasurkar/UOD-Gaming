import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Award, Settings } from 'lucide-react';
import '../Css/Snake.css';
import Foote from './Foote';

const Snake = () => {
  // Game States
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  });
  
  // Game Settings States
  const [difficulty, setDifficulty] = useState('medium');
  const [wallMode, setWallMode] = useState('wrap');
  const [isMuted, setIsMuted] = useState(false);

  const canvasRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const requestRef = useRef(null);
  const directionRef = useRef('right');
  const nextDirectionRef = useRef('right');
  const snakeRef = useRef([{ x: 10, y: 10 }]);
  const fruitRef = useRef({ x: 15, y: 15 });
  const goldenFruitRef = useRef(null);
  const particlesRef = useRef([]);
  const speedRef = useRef(110);
  const audioCtxRef = useRef(null);

  // Constants
  const GRID_SIZE = 20; // grid size (20x20 cells)
  const CELL_COUNT = 30; // 30 cells in width and height
  const CANVAS_SIZE = GRID_SIZE * CELL_COUNT; // 600px

  const getBaseSpeed = (diff) => {
    if (diff === 'easy') return 150;
    if (diff === 'medium') return 110;
    if (diff === 'hard') return 80;
    return 110;
  };

  // Clean up loops on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      stopRenderLoop();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      
      // Prevent webpage scrolling when playing
      if (hasStarted && !isGameOver && activeKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (!hasStarted || isPaused || isGameOver) return;

      const currentDir = directionRef.current;

      if (e.key === 'ArrowUp' && currentDir !== 'down') {
        nextDirectionRef.current = 'up';
      } else if (e.key === 'ArrowDown' && currentDir !== 'up') {
        nextDirectionRef.current = 'down';
      } else if (e.key === 'ArrowLeft' && currentDir !== 'right') {
        nextDirectionRef.current = 'left';
      } else if (e.key === 'ArrowRight' && currentDir !== 'left') {
        nextDirectionRef.current = 'right';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isPaused, isGameOver]);

  // Audio Synthesizer using Web Audio API
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playSound = (type) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      if (type === 'eat') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'gold-eat') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'crash') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.linearRampToValueAtTime(40, now + 0.45);
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.45);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(60, now);
        osc2.frequency.linearRampToValueAtTime(10, now + 0.5);
        gain2.gain.setValueAtTime(0.35, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.5);
      } else if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (err) {
      console.warn('Audio feedback failed:', err);
    }
  };

  // Spark Particle System
  const spawnParticles = (gridX, gridY, color) => {
    const startX = gridX * GRID_SIZE + GRID_SIZE / 2;
    const startY = gridY * GRID_SIZE + GRID_SIZE / 2;
    const count = 12;
    
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const speed = Math.random() * 3 + 2;
      newParticles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  const updateAndDrawParticles = (ctx) => {
    const particles = particlesRef.current;
    const remaining = [];
    
    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;
      
      if (p.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        remaining.push(p);
      }
    }
    particlesRef.current = remaining;
  };

  // 60FPS Render Loop
  const startRenderLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      
      drawGame(ctx);
      updateAndDrawParticles(ctx);
      
      requestRef.current = requestAnimationFrame(tick);
    };
    requestRef.current = requestAnimationFrame(tick);
  };

  const stopRenderLoop = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  };

  const startGame = () => {
    playSound('click');
    setHasStarted(true);
    setIsPaused(false);
    setIsGameOver(false);
    setScore(0);
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    directionRef.current = 'right';
    nextDirectionRef.current = 'right';
    goldenFruitRef.current = null;
    particlesRef.current = [];
    
    const initialSpeed = getBaseSpeed(difficulty);
    speedRef.current = initialSpeed;

    generateFruit();

    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
    }
    gameIntervalRef.current = setInterval(gameLoop, speedRef.current);

    startRenderLoop();
  };

  const updateGameSpeed = (newSpeed) => {
    speedRef.current = newSpeed;
    if (gameIntervalRef.current && hasStarted && !isPaused && !isGameOver) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = setInterval(gameLoop, speedRef.current);
    }
  };

  const adjustSpeed = (newScore) => {
    let baseSpeed = getBaseSpeed(difficulty);
    let speedFactor = 1;
    if (difficulty === 'medium') {
      const increments = Math.floor(newScore / 5);
      speedFactor = Math.pow(0.97, increments);
    } else if (difficulty === 'hard') {
      const increments = Math.floor(newScore / 5);
      speedFactor = Math.pow(0.95, increments);
    }
    const newSpeed = Math.max(35, Math.round(baseSpeed * speedFactor));
    if (newSpeed !== speedRef.current) {
      updateGameSpeed(newSpeed);
    }
  };

  const togglePause = () => {
    if (isGameOver) return;
    playSound('click');
    if (isPaused) {
      setIsPaused(false);
      if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = setInterval(gameLoop, speedRef.current);
      startRenderLoop();
    } else {
      setIsPaused(true);
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
      stopRenderLoop();
    }
  };

  const restartGame = () => {
    stopRenderLoop();
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    startGame();
  };

  const returnToMenu = () => {
    playSound('click');
    stopRenderLoop();
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    setHasStarted(false);
    setIsPaused(false);
    setIsGameOver(false);
    setScore(0);
  };

  const generateFruit = () => {
    let newFruit;
    let isOnSnakeOrGold = true;
    while (isOnSnakeOrGold) {
      newFruit = {
        x: Math.floor(Math.random() * CELL_COUNT),
        y: Math.floor(Math.random() * CELL_COUNT)
      };
      
      const onSnake = snakeRef.current.some(segment => segment.x === newFruit.x && segment.y === newFruit.y);
      const onGold = goldenFruitRef.current && goldenFruitRef.current.x === newFruit.x && goldenFruitRef.current.y === newFruit.y;
      isOnSnakeOrGold = onSnake || onGold;
    }
    fruitRef.current = newFruit;
  };

  const rollForGoldenFruit = () => {
    if (goldenFruitRef.current) return;
    
    if (Math.random() < 0.15) {
      let newGoldFruit;
      let isValid = false;
      while (!isValid) {
        newGoldFruit = {
          x: Math.floor(Math.random() * CELL_COUNT),
          y: Math.floor(Math.random() * CELL_COUNT),
          spawnTime: Date.now(),
          duration: 6000
        };
        
        const onSnake = snakeRef.current.some(segment => segment.x === newGoldFruit.x && segment.y === newGoldFruit.y);
        const onFruit = fruitRef.current.x === newGoldFruit.x && fruitRef.current.y === newGoldFruit.y;
        if (!onSnake && !onFruit) {
          isValid = true;
        }
      }
      goldenFruitRef.current = newGoldFruit;
    }
  };

  const gameLoop = () => {
    if (goldenFruitRef.current) {
      const elapsed = Date.now() - goldenFruitRef.current.spawnTime;
      if (elapsed >= goldenFruitRef.current.duration) {
        goldenFruitRef.current = null;
      }
    }

    moveSnake();
    checkCollisions();
  };

  const moveSnake = () => {
    const snake = [...snakeRef.current];
    const direction = nextDirectionRef.current;
    directionRef.current = direction;
    
    let head = { ...snake[0] };

    if (direction === 'up') head.y--;
    else if (direction === 'down') head.y++;
    else if (direction === 'left') head.x--;
    else if (direction === 'right') head.x++;

    const wrap = wallMode === 'wrap' && difficulty !== 'hard';
    if (wrap) {
      if (head.x < 0) head.x = CELL_COUNT - 1;
      else if (head.x >= CELL_COUNT) head.x = 0;
      
      if (head.y < 0) head.y = CELL_COUNT - 1;
      else if (head.y >= CELL_COUNT) head.y = 0;
    }

    snake.unshift(head);

    let ateNormal = head.x === fruitRef.current.x && head.y === fruitRef.current.y;
    let ateGolden = goldenFruitRef.current && head.x === goldenFruitRef.current.x && head.y === goldenFruitRef.current.y;

    if (ateNormal) {
      playSound('eat');
      spawnParticles(fruitRef.current.x, fruitRef.current.y, '#00ff88');
      
      setScore(prev => {
        const newScore = prev + 1;
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem('snake_highscore', newScore.toString());
        }
        adjustSpeed(newScore);
        return newScore;
      });
      generateFruit();
      rollForGoldenFruit();
    } else if (ateGolden) {
      playSound('gold-eat');
      spawnParticles(goldenFruitRef.current.x, goldenFruitRef.current.y, '#ffff00');
      
      goldenFruitRef.current = null;
      
      setScore(prev => {
        const newScore = prev + 3;
        if (newScore > highScore) {
          setHighScore(newScore);
          localStorage.setItem('snake_highscore', newScore.toString());
        }
        adjustSpeed(newScore);
        return newScore;
      });
    } else {
      snake.pop();
    }
    snakeRef.current = snake;
  };

  const checkCollisions = () => {
    const snake = snakeRef.current;
    const head = snake[0];

    const wrap = wallMode === 'wrap' && difficulty !== 'hard';
    if (!wrap) {
      if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
        triggerGameOver();
        return;
      }
    }

    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        triggerGameOver();
        return;
      }
    }
  };

  const triggerGameOver = () => {
    playSound('crash');
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    stopRenderLoop();
    setIsGameOver(true);
    
    fetch('../scripts/php/snake.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `score=${score}`,
    }).catch(err => console.warn('Score registration skipped:', err));
  };

  const drawGame = (ctx) => {
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CELL_COUNT; i++) {
      ctx.beginPath();
      ctx.moveTo(i * GRID_SIZE, 0);
      ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * GRID_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
      ctx.stroke();
    }

    const snake = snakeRef.current;

    ctx.save();
    for (let i = 1; i < snake.length; i++) {
      const intensity = Math.max(0.4, 1 - (i / snake.length) * 0.6);
      ctx.fillStyle = `rgba(0, 255, 136, ${intensity})`;
      ctx.shadowBlur = 8 * intensity;
      ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
      
      ctx.beginPath();
      ctx.roundRect(
        snake[i].x * GRID_SIZE + 1,
        snake[i].y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2,
        4
      );
      ctx.fill();
    }
    ctx.restore();

    const head = snake[0];
    const headX = head.x * GRID_SIZE;
    const headY = head.y * GRID_SIZE;
    
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff88';
    
    const headGrad = ctx.createRadialGradient(
      headX + GRID_SIZE / 2, headY + GRID_SIZE / 2, 2,
      headX + GRID_SIZE / 2, headY + GRID_SIZE / 2, GRID_SIZE / 2
    );
    headGrad.addColorStop(0, '#8cffcc');
    headGrad.addColorStop(0.4, '#00ff88');
    headGrad.addColorStop(1, '#00aa55');
    ctx.fillStyle = headGrad;
    
    ctx.beginPath();
    ctx.roundRect(
      headX,
      headY,
      GRID_SIZE,
      GRID_SIZE,
      6
    );
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    const dir = directionRef.current;
    let eyeSize = 3;
    let eyeOffset = 5;
    
    if (dir === 'right') {
      ctx.fillRect(headX + GRID_SIZE - eyeOffset, headY + 4, eyeSize, eyeSize);
      ctx.fillRect(headX + GRID_SIZE - eyeOffset, headY + GRID_SIZE - 7, eyeSize, eyeSize);
    } else if (dir === 'left') {
      ctx.fillRect(headX + eyeOffset - eyeSize, headY + 4, eyeSize, eyeSize);
      ctx.fillRect(headX + eyeOffset - eyeSize, headY + GRID_SIZE - 7, eyeSize, eyeSize);
    } else if (dir === 'up') {
      ctx.fillRect(headX + 4, headY + eyeOffset - eyeSize, eyeSize, eyeSize);
      ctx.fillRect(headX + GRID_SIZE - 7, headY + eyeOffset - eyeSize, eyeSize, eyeSize);
    } else if (dir === 'down') {
      ctx.fillRect(headX + 4, headY + GRID_SIZE - eyeOffset, eyeSize, eyeSize);
      ctx.fillRect(headX + GRID_SIZE - 7, headY + GRID_SIZE - eyeOffset, eyeSize, eyeSize);
    }
    ctx.restore();

    const fruit = fruitRef.current;
    const pixelX = fruit.x * GRID_SIZE;
    const pixelY = fruit.y * GRID_SIZE;
    
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff0055';
    
    const grad = ctx.createRadialGradient(
      pixelX + GRID_SIZE / 2 - 2, pixelY + GRID_SIZE / 2 - 2, 1,
      pixelX + GRID_SIZE / 2, pixelY + GRID_SIZE / 2, GRID_SIZE / 2
    );
    grad.addColorStop(0, '#ff66aa');
    grad.addColorStop(0.2, '#ff0055');
    grad.addColorStop(1, '#990033');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pixelX + GRID_SIZE / 2, pixelY + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.ellipse(
      pixelX + GRID_SIZE / 2 + 3,
      pixelY + GRID_SIZE / 2 - GRID_SIZE / 2 + 3,
      1.5,
      3,
      Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    if (goldenFruitRef.current) {
      const gFruit = goldenFruitRef.current;
      const elapsed = Date.now() - gFruit.spawnTime;
      const timeLeft = Math.max(0, gFruit.duration - elapsed);
      const ratio = timeLeft / gFruit.duration;
      
      const gPixelX = gFruit.x * GRID_SIZE;
      const gPixelY = gFruit.y * GRID_SIZE;
      
      ctx.save();
      ctx.shadowBlur = 15 + Math.sin(Date.now() / 100) * 5;
      ctx.shadowColor = '#ffff00';
      
      const gGrad = ctx.createRadialGradient(
        gPixelX + GRID_SIZE / 2 - 3, gPixelY + GRID_SIZE / 2 - 3, 1,
        gPixelX + GRID_SIZE / 2, gPixelY + GRID_SIZE / 2, GRID_SIZE / 2
      );
      gGrad.addColorStop(0, '#ffffff');
      gGrad.addColorStop(0.3, '#ffea00');
      gGrad.addColorStop(1, '#b59400');
      
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gPixelX + GRID_SIZE / 2, gPixelY + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        gPixelX + GRID_SIZE / 2,
        gPixelY + GRID_SIZE / 2,
        (GRID_SIZE / 2) + 6 * ratio,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  };

  useEffect(() => {
    if (!hasStarted || isPaused || isGameOver) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        drawGame(ctx);
      }
    }
  }, [hasStarted, isPaused, isGameOver]);

  return (
    <div className="snake-container">
      {/* Sleek Navigation Bar */}
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Snake</span>
      </div>

      <div className="game-content-card">
        {/* LED Digital Scoreboard */}
        <div className="snake-scoreboard">
          <div className="score-panel current-score">
            <span className="panel-label">Score</span>
            <span className="panel-value digital-text">{String(score).padStart(3, '0')}</span>
          </div>

          <div className="score-panel game-specs">
            <div className="spec-item">
              <span className="spec-label">DIFF</span>
              <span className={`spec-value val-${difficulty}`}>{difficulty.toUpperCase()}</span>
            </div>
            <div className="spec-item">
              <span className="spec-label">WALLS</span>
              <span className="spec-value">{difficulty === 'hard' ? 'SOLID' : wallMode.toUpperCase()}</span>
            </div>
            <button 
              onClick={() => setIsMuted(prev => !prev)} 
              className={`spec-mute-btn ${isMuted ? 'is-muted' : ''}`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          <div className="score-panel high-score">
            <span className="panel-label">Best</span>
            <span className="panel-value digital-text">
              <Award size={18} className="high-score-icon" />
              {String(highScore).padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Arcade Cabinet Frame */}
        <div className="cabinet-screen crt-screen">
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          <canvas 
            ref={canvasRef} 
            id="gameCanvas" 
            width={CANVAS_SIZE} 
            height={CANVAS_SIZE}
          />

          {/* Start Overlay Screen */}
          {!hasStarted && (
            <div className="screen-overlay start-overlay">
              <h2 className="overlay-title pulse">SNAKE ARCADE</h2>
              
              <div className="settings-panel">
                <div className="settings-group">
                  <span className="settings-label">DIFFICULTY</span>
                  <div className="settings-options">
                    <button 
                      onClick={() => { playSound('click'); setDifficulty('easy'); }}
                      className={`setting-option-btn diff-easy ${difficulty === 'easy' ? 'active' : ''}`}
                    >
                      <span className="active-dot"></span>
                      EASY
                    </button>
                    <button 
                      onClick={() => { playSound('click'); setDifficulty('medium'); }}
                      className={`setting-option-btn diff-medium ${difficulty === 'medium' ? 'active' : ''}`}
                    >
                      <span className="active-dot"></span>
                      MEDIUM
                    </button>
                    <button 
                      onClick={() => { playSound('click'); setDifficulty('hard'); }}
                      className={`setting-option-btn diff-hard ${difficulty === 'hard' ? 'active' : ''}`}
                    >
                      <span className="active-dot"></span>
                      HARD
                    </button>
                  </div>
                </div>

                <div className="settings-group">
                  <span className="settings-label">WALL MODE</span>
                  <div className="settings-options">
                    <button 
                      disabled={difficulty === 'hard'}
                      onClick={() => { playSound('click'); setWallMode('wrap'); }}
                      className={`setting-option-btn wall-wrap ${wallMode === 'wrap' && difficulty !== 'hard' ? 'active' : ''} ${difficulty === 'hard' ? 'disabled' : ''}`}
                    >
                      <span className="active-dot"></span>
                      WRAP
                    </button>
                    <button 
                      disabled={difficulty === 'hard'}
                      onClick={() => { playSound('click'); setWallMode('solid'); }}
                      className={`setting-option-btn wall-solid ${wallMode === 'solid' || difficulty === 'hard' ? 'active' : ''} ${difficulty === 'hard' ? 'disabled-locked' : ''}`}
                    >
                      <span className="active-dot"></span>
                      SOLID
                    </button>
                  </div>
                  {difficulty === 'hard' && (
                    <span className="settings-warning">HARD MODE LOCKS WALLS TO SOLID</span>
                  )}
                </div>

                <div className="settings-group">
                  <span className="settings-label">SOUND EFFECTS</span>
                  <button 
                    onClick={() => {
                      const newMute = !isMuted;
                      setIsMuted(newMute);
                      if (!newMute) {
                        try {
                          const ctx = new (window.AudioContext || window.webkitAudioContext)();
                          const osc = ctx.createOscillator();
                          const gain = ctx.createGain();
                          osc.frequency.setValueAtTime(600, ctx.currentTime);
                          gain.gain.setValueAtTime(0.05, ctx.currentTime);
                          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
                          osc.connect(gain);
                          gain.connect(ctx.destination);
                          osc.start();
                          osc.stop(ctx.currentTime + 0.05);
                        } catch(e){}
                      }
                    }}
                    className={`setting-sound-btn ${isMuted ? 'muted' : 'unmuted'}`}
                  >
                    {isMuted ? 'SOUND: OFF' : 'SOUND: ON'}
                  </button>
                </div>
              </div>

              <button onClick={startGame} className="arcade-btn start-btn">
                <Play size={18} fill="currentColor" />
                INSERT COIN & PLAY
              </button>
            </div>
          )}

          {/* Pause Overlay Screen */}
          {hasStarted && isPaused && (
            <div className="screen-overlay pause-overlay">
              <h2 className="overlay-title">Paused</h2>
              <p className="overlay-instructions">Press resume to continue your run.</p>
              <div className="overlay-buttons" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button onClick={togglePause} className="arcade-btn resume-btn">
                  <Play size={18} fill="currentColor" />
                  Resume
                </button>
                <button onClick={returnToMenu} className="arcade-btn menu-btn-overlay">
                  <Settings size={18} />
                  Menu
                </button>
              </div>
            </div>
          )}

          {/* Game Over Overlay Screen */}
          {hasStarted && isGameOver && (
            <div className="screen-overlay game-over-overlay">
              <h2 className="overlay-title text-alert">Game Over</h2>
              <p className="overlay-instructions">Final score: {score}</p>
              {score >= highScore && score > 0 && (
                <div className="new-record-badge">NEW HIGH SCORE!</div>
              )}
              <div className="overlay-buttons" style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button onClick={restartGame} className="arcade-btn restart-btn">
                  <RotateCcw size={18} />
                  Try Again
                </button>
                <button onClick={returnToMenu} className="arcade-btn menu-btn-overlay">
                  <Settings size={18} />
                  Menu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cabinet Control Panel - Always visible to simulate cabinet layout */}
        <div className="cabinet-controls">
          <button 
            disabled={!hasStarted || isGameOver}
            onClick={togglePause} 
            className={`control-btn pause-btn ${(!hasStarted || isGameOver) ? 'disabled' : ''}`}
            title="Pause/Resume Game"
          >
            {isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} />}
            <span>{isPaused ? 'Run' : 'Pause'}</span>
          </button>
          <button 
            disabled={!hasStarted}
            onClick={restartGame} 
            className={`control-btn restart-btn ${!hasStarted ? 'disabled' : ''}`}
            title="Restart Game"
          >
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
          <button 
            disabled={!hasStarted}
            onClick={returnToMenu} 
            className={`control-btn menu-btn ${!hasStarted ? 'disabled' : ''}`}
            title="Return to Menu"
          >
            <Settings size={18} />
            <span>Menu</span>
          </button>
        </div>
      </div>

      <Foote />
    </div>
  );
};

export default Snake;
