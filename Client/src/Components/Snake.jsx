import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Award, Settings, Gamepad2, Square } from 'lucide-react';
import axios from 'axios';
import '../Css/Snake.css';

const Snake = () => {
  const location = useLocation();
  const [gameId, setGameId] = useState(null);
  
  useEffect(() => {
    if (location.state?.gameId) {
      setGameId(location.state.gameId);
    } else {
      // Fallback: fetch game ID by title
      axios.get('/api/v1/games')
        .then(res => {
          const game = res.data.games?.find(g => g.title === "Snake Arcade");
          if (game) setGameId(game._id);
        })
        .catch(err => console.error("Failed to load game info:", err));
    }
  }, [location.state]);

  // Game States
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const hasStartedRef = useRef(false);
  const isPausedRef = useRef(false);
  const isGameOverRef = useRef(false);

  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { isGameOverRef.current = isGameOver; }, [isGameOver]);

  const [score, setScore] = useState(0);
  const [rewards, setRewards] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting', 'submitted', 'failed', 'offline'
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('snake_highscore') || '0', 10);
  });
  
  // Game Settings States
  const [difficulty, setDifficulty] = useState('medium');
  const [isMuted, setIsMuted] = useState(false);

  // Leaderboard States
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const mockLeaderboard = [
    { username: "CYBER_NINJA", score: 450, rank: 1 },
    { username: "NEON_RIDER", score: 380, rank: 2 },
    { username: "RETRO_BOY", score: 310, rank: 3 },
    { username: "GRID_RUNNER", score: 260, rank: 4 },
    { username: "SNAKE_MASTER", score: 210, rank: 5 }
  ];

  const fetchLeaderboard = async () => {
    if (!gameId) return;
    try {
      setLeaderboardLoading(true);
      const res = await axios.get(`/api/v1/leaderboard/game/${gameId}?limit=7`);
      setLeaderboard(res.data.leaderboardWithRanks || res.data.leaderboard || []);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (gameId) {
      fetchLeaderboard();
    }
  }, [gameId]);

  const canvasRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const requestRef = useRef(null);
  const directionRef = useRef('right');
  const nextDirectionRef = useRef('right');
  const inputQueueRef = useRef([]);
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
      // 1. Intercept Spacebar for Start / Pause / Resume / Restart
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!hasStartedRef.current) {
          startGame();
        } else if (isGameOverRef.current) {
          restartGame();
        } else {
          togglePause();
        }
        return;
      }

      // 2. Intercept P key for Pause / Resume
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (hasStartedRef.current && !isGameOverRef.current) {
          togglePause();
        }
        return;
      }

      const activeKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'
      ];
      
      // Prevent webpage scrolling when playing
      if (hasStartedRef.current && !isGameOverRef.current && activeKeys.includes(e.key)) {
        e.preventDefault();
      }

      if (!hasStartedRef.current || isPausedRef.current || isGameOverRef.current) return;

      let keyDir = null;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') keyDir = 'up';
      else if (key === 'arrowdown' || key === 's') keyDir = 'down';
      else if (key === 'arrowleft' || key === 'a') keyDir = 'left';
      else if (key === 'arrowright' || key === 'd') keyDir = 'right';

      if (!keyDir) return;

      // Limit queue to 2 inputs to prevent trailing buffering lag
      if (inputQueueRef.current.length < 2) {
        const lastInQueue = inputQueueRef.current.length > 0 
          ? inputQueueRef.current[inputQueueRef.current.length - 1] 
          : directionRef.current;
        
        // Prevent immediate 180-degree turns relative to the last queued direction
        const isOpposite = 
          (keyDir === 'up' && lastInQueue === 'down') ||
          (keyDir === 'down' && lastInQueue === 'up') ||
          (keyDir === 'left' && lastInQueue === 'right') ||
          (keyDir === 'right' && lastInQueue === 'left');

        if (!isOpposite && keyDir !== lastInQueue) {
          inputQueueRef.current.push(keyDir);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // High Precision Render & Tick Loop using requestAnimationFrame
  const startRenderLoop = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    let lastTickTime = null;
    inputQueueRef.current = []; // Clear key queue on start
    
    const tick = (now) => {
      if (!lastTickTime) lastTickTime = now;
      const elapsed = now - lastTickTime;
      
      // Update game physics if active (using stable delta accumulator)
      if (hasStartedRef.current && !isPausedRef.current && !isGameOverRef.current) {
        let ticks = 0;
        let tempElapsed = elapsed;
        
        while (tempElapsed >= speedRef.current && ticks < 5 && !isGameOverRef.current) {
          gameLoop();
          tempElapsed -= speedRef.current;
          ticks++;
        }
        
        if (ticks > 0) {
          lastTickTime = now - tempElapsed;
        }
      } else {
        lastTickTime = now;
      }
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        drawGame(ctx);
        updateAndDrawParticles(ctx);
      }
      
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
    startRenderLoop();
  };

  const updateGameSpeed = (newSpeed) => {
    speedRef.current = newSpeed;
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
      startRenderLoop();
    } else {
      setIsPaused(true);
      stopRenderLoop();
    }
  };

  const restartGame = () => {
    setRewards(null);
    setSubmitStatus('');
    stopRenderLoop();
    startGame();
  };

  const returnToMenu = () => {
    playSound('click');
    setRewards(null);
    setSubmitStatus('');
    stopRenderLoop();
    setHasStarted(false);
    setIsPaused(false);
    setIsGameOver(false);
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
    if (inputQueueRef.current.length > 0) {
      nextDirectionRef.current = inputQueueRef.current.shift();
    }
    const snake = [...snakeRef.current];
    const direction = nextDirectionRef.current;
    directionRef.current = direction;
    
    let head = { ...snake[0] };

    if (direction === 'up') head.y--;
    else if (direction === 'down') head.y++;
    else if (direction === 'left') head.x--;
    else if (direction === 'right') head.x++;

    // Check boundary collision BEFORE unshifting the head (so the head bumps and stays inside the grid visually)
    if (head.x < 0 || head.x >= CELL_COUNT || head.y < 0 || head.y >= CELL_COUNT) {
      triggerGameOver();
      return;
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

    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        triggerGameOver();
        return;
      }
    }
  };

  const triggerGameOver = () => {
    playSound('crash');
    isGameOverRef.current = true;
    if (gameIntervalRef.current) {
      clearInterval(gameIntervalRef.current);
      gameIntervalRef.current = null;
    }
    stopRenderLoop();
    setIsGameOver(true);
    
    const token = localStorage.getItem('token');
    
    if (gameId && token) {
      setSubmitStatus('submitting');
      axios.post(`/api/v1/games/${gameId}/score`, {
        score: score,
        level: difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
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
        fetchLeaderboard();
        
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
            console.error('Failed to update local storage user info:', e);
          }
        }
      })
      .catch(err => {
        console.error('Failed to submit score:', err);
        setSubmitStatus('failed');
      });
    } else {
      console.warn('Score registration skipped: Missing gameId or authentication token.');
      setSubmitStatus('offline');
    }
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

    // Draw neon border around the grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

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

  const isGameplayActive = hasStarted && !isPaused && !isGameOver;

  return (
    <div className="snake-container">
      {/* Floating minimal back button overlay */}
      {!isGameplayActive && (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      )}

      <div className={`game-content-card snake-game-layout ${isGameplayActive ? 'gameplay-active' : ''}`}>
        {/* Left Column: Leaderboard */}
        <div className="layout-column side-column leaderboard-column">
          <div className="sidebar-header">
            <Award size={18} style={{ color: 'var(--accent-yellow)', filter: 'drop-shadow(0 0 5px var(--accent-yellow))' }} />
            <h3 className="sidebar-title">LEADERBOARD</h3>
          </div>
          <div className="leaderboard-list">
            {leaderboardLoading ? (
              <div className="sidebar-loading">Loading rankings...</div>
            ) : (leaderboard.length > 0 ? leaderboard : mockLeaderboard).map((entry, idx) => (
              <div key={idx} className={`leaderboard-entry rank-${entry.rank || idx + 1}`}>
                <span className="entry-rank">{entry.rank || idx + 1}</span>
                <span className="entry-username">{entry.username || (entry.user && entry.user.username) || "PLAYER"}</span>
                <span className="entry-score">{entry.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Arcade Cabinet Frame */}
        <div className="layout-column main-column">
          <div className="cabinet-screen crt-screen">
            {/* CRT scanlines, reflection and flicker overlay */}
            <div className="crt-scanlines"></div>
            <div className="crt-reflection"></div>
            <div className="crt-flicker"></div>

            {/* Floating HUD Overlays - Relocated inside playing area boundary strip */}
            <div className="game-hud-container snake-hud-strip">
              <div className="game-hud-item">
                <span className="game-hud-label" style={{ fontSize: '0.65rem' }}>Score</span>
                <span className="game-hud-value" style={{ fontSize: '1.2rem' }}>{String(score).padStart(3, '0')}</span>
              </div>

              <div className="game-hud-item">
                <span className="game-hud-label" style={{ fontSize: '0.65rem' }}>Diff</span>
                <span className="game-hud-value" style={{ fontSize: '1.0rem', color: 'var(--primary-neon)' }}>{difficulty.toUpperCase()}</span>
              </div>

              <div className="game-hud-item">
                <span className="game-hud-label" style={{ fontSize: '0.65rem' }}>Best</span>
                <span className="game-hud-value" style={{ fontSize: '1.2rem', color: 'var(--accent-yellow)', textShadow: '0 0 8px rgba(255, 255, 0, 0.4)' }}>
                  {String(highScore).padStart(3, '0')}
                </span>
              </div>
            </div>

            <canvas 
              ref={canvasRef} 
              id="gameCanvas" 
              width={CANVAS_SIZE} 
              height={CANVAS_SIZE}
            />

            {/* Start Overlay Screen - Made cleaner since controls are on side */}
            {!hasStarted && (
              <div className="screen-overlay start-overlay" style={{ cursor: 'pointer' }} onClick={startGame}>
                <h2 className="overlay-title pulse">SNAKE ARCADE</h2>
                <Gamepad2 className="mb-4 text-cyan-400" style={{ filter: 'drop-shadow(0 0 8px #00d4ff)' }} size={48} />
                <p className="overlay-instructions" style={{ fontSize: '0.9rem' }}>Press SPACEBAR or CLICK HERE to Play</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '300px', lineHeight: '1.4' }}>
                  Use Arrow keys or WASD to navigate. Eat neon food to grow and speed up!
                </span>
              </div>
            )}

            {/* Pause Overlay Screen */}
            {hasStarted && isPaused && (
              <div className="screen-overlay pause-overlay">
                <h2 className="overlay-title">Paused</h2>
                <p className="overlay-instructions" style={{ fontSize: '0.8rem', marginBottom: '15px' }}>Press SPACEBAR to Resume</p>
                <button 
                  onClick={togglePause} 
                  className="arcade-btn resume-btn" 
                  style={{ padding: '8px 16px', fontSize: '0.8rem', minWidth: '150px', justifyContent: 'center' }}
                >
                  Resume Game
                </button>
              </div>
            )}

            {/* Game Over Overlay Screen */}
            {hasStarted && isGameOver && (
              <div className="screen-overlay game-over-overlay">
                <h2 className="overlay-title text-alert">Game Over</h2>
                <p className="overlay-instructions" style={{ fontSize: '0.9rem', marginBottom: '4px' }}>Final score: {score}</p>
                {score >= highScore && score > 0 && (
                  <div className="new-record-badge">NEW HIGH SCORE!</div>
                )}
                
                {submitStatus === 'submitting' && (
                  <p className="rewards-status-text" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saving score online...</p>
                )}
                {submitStatus === 'submitted' && rewards && (
                  <div className="game-over-rewards" style={{ margin: '8px 0', padding: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.8rem' }}>
                    <div style={{ color: '#ffd700', marginBottom: '2px' }}>🪙 +{rewards.coinsEarned} Coins</div>
                    <div style={{ color: 'var(--primary-neon)', marginBottom: '2px' }}>⚡ +{rewards.expGained} XP</div>
                    {rewards.leveledUp && (
                      <div style={{ color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,255,136,0.5)', marginTop: '2px' }}>LEVEL UP! (Lv {rewards.level})</div>
                    )}
                  </div>
                )}
                {submitStatus === 'failed' && (
                  <p className="rewards-status-text" style={{ fontSize: '0.75rem', color: 'var(--secondary-neon)' }}>Failed to save score online.</p>
                )}
                {submitStatus === 'offline' && (
                  <p className="rewards-status-text" style={{ fontSize: '0.75rem', color: 'var(--accent-orange)' }}>Log in to save stats & earn coins!</p>
                )}
                
                <button onClick={restartGame} className="arcade-btn restart-btn" style={{ padding: '8px 16px', fontSize: '0.8rem', marginTop: '10px' }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Other buttons & Settings */}
        <div className="layout-column side-column controls-column">
          <div className="sidebar-header">
            <Settings size={18} style={{ color: 'var(--primary-neon)', filter: 'drop-shadow(0 0 5px var(--primary-neon))' }} />
            <h3 className="sidebar-title">SYSTEM CONTROLS</h3>
          </div>

          <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
            {/* Primary Action Button - Play/Pause/Resume */}
            <div className="sidebar-section">
              <span className="section-label">Arcade Action</span>
              {!hasStarted ? (
                <button onClick={startGame} className="primary-control-btn glow-green">
                  <Play size={18} fill="currentColor" />
                  <span>START RUN</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isPaused ? (
                    <button onClick={togglePause} className="primary-control-btn glow-blue">
                      <Play size={18} fill="currentColor" />
                      <span>RESUME RUN</span>
                    </button>
                  ) : (
                    <button onClick={togglePause} className="primary-control-btn glow-yellow" disabled={isGameOver}>
                      <Pause size={18} />
                      <span>PAUSE RUN</span>
                    </button>
                  )}
                  
                  {!isGameOver && (
                    <button 
                      onClick={() => { playSound('click'); triggerGameOver(); }} 
                      className="primary-control-btn glow-red"
                    >
                      <Square size={16} fill="currentColor" />
                      <span>END RUN</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Game Options */}
            <div className="sidebar-section">
              <span className="section-label">Difficulty</span>
              <div className="option-toggle-group">
                <button 
                  onClick={() => { playSound('click'); setDifficulty('easy'); }}
                  className={`opt-toggle-btn diff-easy ${difficulty === 'easy' ? 'active' : ''}`}
                >
                  EASY
                </button>
                <button 
                  onClick={() => { playSound('click'); setDifficulty('medium'); }}
                  className={`opt-toggle-btn diff-medium ${difficulty === 'medium' ? 'active' : ''}`}
                >
                  MED
                </button>
                <button 
                  onClick={() => { playSound('click'); setDifficulty('hard'); }}
                  className={`opt-toggle-btn diff-hard ${difficulty === 'hard' ? 'active' : ''}`}
                >
                  HARD
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <span className="section-label">Audio Synth</span>
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
                className="secondary-control-btn"
              >
                {isMuted ? '🔊 UNMUTE AUDIO' : '🔇 MUTE AUDIO'}
              </button>
            </div>
          </div>

          <div className="sidebar-footer-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <button 
              disabled={!hasStarted}
              onClick={restartGame} 
              className="secondary-control-btn"
              title="Restart Game"
            >
              <RotateCcw size={14} />
              <span>RESTART RUN</span>
            </button>
            <button 
              onClick={returnToMenu} 
              className="secondary-control-btn"
              title="Return to Menu"
            >
              <Settings size={14} />
              <span>EXIT CABINET</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Snake;
