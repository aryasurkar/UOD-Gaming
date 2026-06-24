import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pause } from 'lucide-react';
import axios from 'axios';
import '../Css/BrickBreaker.css';

// Sound synthesizer using Web Audio API
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
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.08);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'paddle') {
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
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.6);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.warn("Audio Context init failed:", e);
  }
};

const BRICK_COLORS = ['#ff007f', '#ea580c', '#00d4ff', '#00ff88'];

const BrickBreaker = () => {
  // Game states: 'LOBBY' | 'GAMEPLAY' | 'PAUSE' | 'GAMEOVER'
  const [gameState, setGameState] = useState('LOBBY');
  const gameStateRef = useRef('LOBBY');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Audio Control
  const [muted, setMuted] = useState(() => localStorage.getItem('arcade_muted') === 'true');
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
    localStorage.setItem('arcade_muted', muted.toString());
  }, [muted]);

  // Core metrics
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const [lives, setLives] = useState(3);
  const livesRef = useRef(3);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const [level, setLevel] = useState(1);
  const levelRef = useRef(1);
  useEffect(() => { levelRef.current = level; }, [level]);

  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('breakout_high_score') || '0', 10);
  });

  const [isBallLaunched, setIsBallLaunched] = useState(false);
  const isBallLaunchedRef = useRef(false);
  useEffect(() => { isBallLaunchedRef.current = isBallLaunched; }, [isBallLaunched]);

  // Menu navigation index
  const [menuIndex, setMenuIndex] = useState(0);

  // API sync states
  const [gameId, setGameId] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('');
  const [rewards, setRewards] = useState(null);

  // Canvas Refs & gravity loops
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Simulation parameters
  const paddleRef = useRef({ x: 255, width: 90, height: 12 });
  const ballRef = useRef({ x: 300, y: 360, vx: 2.5, vy: -3.5, radius: 7, baseSpeed: 4.5 });
  const bricksRef = useRef([]);
  const keysRef = useRef({ left: false, right: false });

  // Constants
  const CANVAS_SIZE = 600;

  // Retrieve game info
  useEffect(() => {
    axios.get('/api/v1/games')
      .then(res => {
        const game = res.data.games?.find(g => g.title === "Neon Brick Breaker");
        if (game) setGameId(game._id);
      })
      .catch(err => console.error("Failed to load game info:", err));
  }, []);

  // Submit high score
  const submitBreakoutScore = async (finalScore) => {
    const token = localStorage.getItem('token');
    if (gameId && token && finalScore > 0) {
      setSubmitStatus('submitting');
      try {
        const res = await axios.post(`/api/v1/games/${gameId}/score`, {
          score: finalScore,
          level: levelRef.current
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      } catch (err) {
        console.error(err);
        setSubmitStatus('failed');
      }
    } else {
      setSubmitStatus('offline');
    }
  };

  // Re-build bricks layout
  const buildBricks = () => {
    const cols = 8;
    const rows = 4;
    const padding = 8;
    const offsetTop = 120;
    const offsetLeft = 32;
    const brickW = 60;
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
    bricksRef.current = list;
  };

  const resetBall = () => {
    const paddle = paddleRef.current;
    const ball = ballRef.current;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = 515;
    ball.vx = 2.5 * (Math.random() > 0.5 ? 1 : -1);
    ball.vy = -3.5;
    setIsBallLaunched(false);
  };

  // Launch fresh game
  const startGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setRewards(null);
    setSubmitStatus('');
    setMenuIndex(0);

    paddleRef.current.x = 255;
    ballRef.current.baseSpeed = 4.5;
    buildBricks();
    resetBall();
    setGameState('GAMEPLAY');
  };

  const triggerBallLaunch = () => {
    if (gameStateRef.current === 'GAMEPLAY' && !isBallLaunchedRef.current) {
      setIsBallLaunched(true);
      playSound('paddle', mutedRef.current);
    }
  };

  // Keyboard navigation controls
  const handleKeyboardNav = (code) => {
    const curState = gameStateRef.current;
    if (curState === 'LOBBY') {
      if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        startGame();
      }
    } else if (curState === 'PAUSE') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click', mutedRef.current);
        setMenuIndex(prev => (prev === 0 ? 2 : prev - 1));
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click', mutedRef.current);
        setMenuIndex(prev => (prev === 2 ? 0 : prev + 1));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        if (menuIndex === 0) {
          lastFrameTimeRef.current = performance.now();
          setGameState('GAMEPLAY');
        } else if (menuIndex === 1) {
          startGame();
        } else {
          setGameState('LOBBY');
        }
      } else if (code === 'Escape') {
        playSound('click', mutedRef.current);
        lastFrameTimeRef.current = performance.now();
        setGameState('GAMEPLAY');
      }
    } else if (curState === 'GAMEOVER') {
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowDown' || code === 'KeyS') {
        playSound('click', mutedRef.current);
        setMenuIndex(prev => (prev === 0 ? 1 : 0));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        if (menuIndex === 0) {
          startGame();
        } else {
          setGameState('LOBBY');
        }
      }
    } else if (curState === 'GAMEPLAY') {
      if (code === 'Escape') {
        playSound('click', mutedRef.current);
        setGameState('PAUSE');
        setMenuIndex(0);
      } else if (code === 'Space' || code === 'Enter') {
        triggerBallLaunch();
      }
    }
  };

  // Keyboard listeners hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeStates = ['LOBBY', 'PAUSE', 'GAMEOVER', 'GAMEPLAY'];
      if (activeStates.includes(gameStateRef.current)) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        handleKeyboardNav(e.code);
      }

      if (gameStateRef.current === 'GAMEPLAY') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
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
  }, []);

  // Canvas Clicks
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Speaker check
    if (clickX >= 540 && clickX <= 590 && clickY >= 10 && clickY <= 50) {
      playSound('click', !muted);
      setMuted(prev => !prev);
      return;
    }

    const curState = gameState;
    if (curState === 'LOBBY') {
      if (clickX >= 150 && clickX <= 450 && clickY >= 280 && clickY <= 320) {
        playSound('click', muted);
        startGame();
      }
    } else if (curState === 'PAUSE') {
      if (clickX >= 200 && clickX <= 400 && clickY >= 240 && clickY <= 280) {
        playSound('click', muted);
        lastFrameTimeRef.current = performance.now();
        setGameState('GAMEPLAY');
      } else if (clickX >= 200 && clickX <= 400 && clickY >= 300 && clickY <= 340) {
        playSound('click', muted);
        startGame();
      } else if (clickX >= 200 && clickX <= 400 && clickY >= 360 && clickY <= 400) {
        playSound('click', muted);
        setGameState('LOBBY');
      }
    } else if (curState === 'GAMEOVER') {
      if (clickX >= 150 && clickX <= 450 && clickY >= 440 && clickY <= 480) {
        playSound('click', muted);
        startGame();
      } else if (clickX >= 150 && clickX <= 450 && clickY >= 495 && clickY <= 535) {
        playSound('click', muted);
        setGameState('LOBBY');
      }
    } else if (curState === 'GAMEPLAY') {
      triggerBallLaunch();
    }
  };

  // Mouse Move tracks paddle
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || gameStateRef.current !== 'GAMEPLAY') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    const paddle = paddleRef.current;
    paddle.x = Math.max(0, Math.min(CANVAS_SIZE - paddle.width, mouseX - paddle.width / 2));

    if (!isBallLaunchedRef.current) {
      ballRef.current.x = paddle.x + paddle.width / 2;
    }
  };

  // Main Canvas physics & draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = (time) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      const dt = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;

      // Update Physics
      if (gameStateRef.current === 'GAMEPLAY') {
        const paddle = paddleRef.current;
        const ball = ballRef.current;
        const keys = keysRef.current;

        // Move paddle with keys
        if (keys.left) {
          paddle.x = Math.max(0, paddle.x - 7);
        }
        if (keys.right) {
          paddle.x = Math.min(CANVAS_SIZE - paddle.width, paddle.x + 7);
        }

        if (!isBallLaunchedRef.current) {
          ball.x = paddle.x + paddle.width / 2;
          ball.y = 515;
        } else {
          // Ball movement
          ball.x += ball.vx;
          ball.y += ball.vy;

          // Wall bounces
          if (ball.x + ball.radius >= CANVAS_SIZE) {
            ball.x = CANVAS_SIZE - ball.radius;
            ball.vx = -ball.vx;
            playSound('wall', mutedRef.current);
          } else if (ball.x - ball.radius <= 0) {
            ball.x = ball.radius;
            ball.vx = -ball.vx;
            playSound('wall', mutedRef.current);
          }

          if (ball.y - ball.radius <= 80) { // top boundary is HUD divider
            ball.y = 80 + ball.radius;
            ball.vy = -ball.vy;
            playSound('wall', mutedRef.current);
          }

          // Lose life when falling below bottom boundary
          if (ball.y + ball.radius >= 560) {
            playSound('lose', mutedRef.current);
            setLives(prev => {
              const nextLives = prev - 1;
              if (nextLives <= 0) {
                setGameState('GAMEOVER');
                setMenuIndex(0);
                playSound('gameover', mutedRef.current);
                submitBreakoutScore(scoreRef.current);
              } else {
                resetBall();
              }
              return nextLives;
            });
          }

          // Paddle bounce
          if (
            ball.y + ball.radius >= 530 &&
            ball.y - ball.radius <= 534 &&
            ball.x >= paddle.x &&
            ball.x <= paddle.x + paddle.width &&
            ball.vy > 0
          ) {
            playSound('paddle', mutedRef.current);
            // Dynamic angle math
            const relativeX = ball.x - (paddle.x + paddle.width / 2);
            const normalized = relativeX / (paddle.width / 2);
            const maxAngle = Math.PI / 3;
            const angle = normalized * maxAngle;
            const speed = ball.baseSpeed;

            ball.vx = speed * Math.sin(angle);
            ball.vy = -speed * Math.cos(angle);
            ball.y = 530 - ball.radius;
          }

          // Bricks collision loop
          let activeCount = 0;
          const bricks = bricksRef.current;
          for (let i = 0; i < bricks.length; i++) {
            const brick = bricks[i];
            if (!brick.active) continue;
            activeCount++;

            if (
              ball.x + ball.radius >= brick.x &&
              ball.x - ball.radius <= brick.x + brick.w &&
              ball.y + ball.radius >= brick.y &&
              ball.y - ball.radius <= brick.y + brick.h
            ) {
              brick.active = false;
              playSound('brick', mutedRef.current);
              ball.vy = -ball.vy;

              setScore(prev => {
                const nextScore = prev + 10;
                if (nextScore > highScore) {
                  localStorage.setItem('breakout_high_score', nextScore.toString());
                  setHighScore(nextScore);
                }
                return nextScore;
              });

              activeCount--;
              break;
            }
          }

          // Level advanced
          if (activeCount === 0 && bricks.length > 0) {
            playSound('win', mutedRef.current);
            setLevel(prev => {
              const nextLvl = prev + 1;
              ball.baseSpeed += 0.5;
              buildBricks();
              resetBall();
              return nextLvl;
            });
          }
        }
      }

      // Drawing
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.shadowBlur = 0;

      // Space lines
      ctx.strokeStyle = '#0a0512';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 100, 0);
        ctx.lineTo(i * 100, CANVAS_SIZE);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * 100);
        ctx.lineTo(CANVAS_SIZE, i * 100);
        ctx.stroke();
      }

      const curState = gameStateRef.current;

      // ----------------------------------------------------
      // STATE: LOBBY
      // ----------------------------------------------------
      if (curState === 'LOBBY') {
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 36px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NEON BRICK BREAKER', CANVAS_SIZE / 2, 130);

        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#b4b4c8';
        ctx.font = '14px "Exo 2", sans-serif';
        ctx.fillText('DEFLECTOR DEFENSE CABINET', CANVAS_SIZE / 2, 170);

        const lobbyItems = ['START SIMULATION'];
        lobbyItems.forEach((text, idx) => {
          const isSelected = menuIndex === 0;
          const y = 300 + idx * 60;

          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_SIZE / 2 - 140, y - 28, 280, 40);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '16px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_SIZE / 2, y);
        });

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.fillText('USE ARROWS / WASD TO NAVIGATE • SPACEBAR TO SELECT', CANVAS_SIZE / 2, 550);
      }

      // ----------------------------------------------------
      // STATE: PAUSE
      // ----------------------------------------------------
      else if (curState === 'PAUSE') {
        drawActiveGameElements(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.85)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 36px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM PAUSED', CANVAS_SIZE / 2, 160);

        const pauseItems = ['RESUME', 'RESTART', 'BACK TO MENU'];
        pauseItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 266 + idx * 60;

          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_SIZE / 2 - 100, y - 26, 200, 36);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '15px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_SIZE / 2, y);
        });
      }

      // ----------------------------------------------------
      // STATE: GAMEOVER
      // ----------------------------------------------------
      else if (curState === 'GAMEOVER') {
        drawActiveGameElements(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.88)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 34px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM OVERLOADED', CANVAS_SIZE / 2, 110);

        // CLI Sync logger
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(80, 160, 440, 230);
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
        ctx.strokeRect(80, 160, 440, 230);

        ctx.font = '13px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ff007f';
        ctx.fillText(`> Deflector shield matrices collapsed.`, 100, 190);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`> Telemetry Final Score: ${scoreRef.current.toLocaleString()}`, 100, 210);

        if (submitStatus === 'submitting') {
          ctx.fillStyle = '#00d4ff';
          ctx.fillText(`> Connecting to deflector registry database...`, 100, 240);
          ctx.fillText(`> Syncing highscore blocks...`, 100, 260);
        } else if (submitStatus === 'submitted' && rewards) {
          ctx.fillStyle = '#00ff88';
          ctx.fillText(`> DATA UPLOAD VERIFIED. SYNC STABLE.`, 100, 240);
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`> CREDITS EARNED:`, 100, 270);
          ctx.fillText(`  🪙 +${rewards.coinsEarned} Arcade Coins`, 100, 290);
          ctx.fillText(`  ⚡ +${rewards.expGained} Experience Nodes`, 100, 310);
          if (rewards.leveledUp) {
            ctx.fillStyle = '#00d4ff';
            ctx.fillText(`  [NOTICE] LEVEL UP! New Level ${rewards.level}`, 100, 335);
          }
        } else if (submitStatus === 'failed') {
          ctx.fillStyle = '#ff0055';
          ctx.fillText(`> [CRITICAL_ERROR] DATABASE NODE SYNC FAILURE`, 100, 240);
        } else if (submitStatus === 'offline') {
          ctx.fillStyle = '#ffaa00';
          ctx.fillText(`> [NOTICE] OFFLINE OPERATION ACTIVE`, 100, 240);
          ctx.fillText(`> Log in to authorize rewards.`, 100, 265);
        }

        // Action Options
        const gameOverItems = ['PLAY AGAIN', 'QUIT TO MENU'];
        gameOverItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 460 + idx * 55;

          ctx.textAlign = 'center';
          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_SIZE / 2 - 130, y - 26, 260, 36);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px "Orbitron", monospace';
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8888a0';
            ctx.font = '15px "Orbitron", monospace';
          }
          ctx.fillText(text, CANVAS_SIZE / 2, y);
        });
      }

      // ----------------------------------------------------
      // STATE: GAMEPLAY
      // ----------------------------------------------------
      else if (curState === 'GAMEPLAY') {
        drawActiveGameElements(ctx);
      }

      // Draw global speaker speaker icon
      drawSpeakerIcon(ctx);

      requestRef.current = requestAnimationFrame(render);
    };

    // Helper: Draw bricks, paddles, ball, and overlays
    const drawActiveGameElements = (c) => {
      // 1. Draw top HUD panel
      c.textAlign = 'left';
      c.fillStyle = '#8888a0';
      c.font = '11px "Orbitron", monospace';
      c.fillText('SCORE', 50, 30);
      c.fillText('LEVEL', 200, 30);
      c.fillText('DEFENSE SHIELDS', 350, 30);
      c.fillText('BEST', 500, 30);

      c.fillStyle = '#ffffff';
      c.font = 'bold 16px "Orbitron", monospace';
      c.fillText(scoreRef.current.toLocaleString(), 50, 52);

      c.fillStyle = '#00d4ff';
      c.fillText(String(levelRef.current), 200, 52);

      c.fillStyle = '#ffd700';
      c.fillText(highScore.toLocaleString(), 500, 52);

      // Draw glowing battery shield cells
      for (let i = 0; i < 3; i++) {
        const x = 350 + i * 20;
        const y = 38;
        const w = 12;
        const h = 18;

        c.strokeStyle = 'rgba(255,255,255,0.15)';
        c.lineWidth = 1.5;
        c.strokeRect(x, y, w, h);
        c.fillStyle = 'rgba(255,255,255,0.2)';
        c.fillRect(x + 3, y - 2, 6, 2);

        if (i < livesRef.current) {
          c.fillStyle = livesRef.current === 1 ? '#ff0055' : '#00ff88';
          c.fillRect(x + 2, y + 2, w - 4, h - 4);
        }
      }

      // Divider line
      c.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, 78);
      c.lineTo(CANVAS_SIZE, 78);
      c.stroke();

      // 2. Draw Bricks
      const bricks = bricksRef.current;
      bricks.forEach(brick => {
        if (!brick.active) return;
        c.fillStyle = brick.color + '26'; // transparent fill
        c.fillRect(brick.x, brick.y, brick.w, brick.h);

        c.shadowColor = brick.color;
        c.shadowBlur = 8;
        c.strokeStyle = brick.color;
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
        c.stroke();
        c.shadowBlur = 0;
      });

      // 3. Draw Paddle
      const paddle = paddleRef.current;
      c.fillStyle = '#00d4ff26';
      c.fillRect(paddle.x, 530, paddle.width, paddle.height);
      c.strokeStyle = '#00d4ff';
      c.lineWidth = 3;
      c.shadowColor = '#00d4ff';
      c.shadowBlur = 10;
      c.beginPath();
      c.roundRect(paddle.x, 530, paddle.width, paddle.height, 6);
      c.stroke();
      c.shadowBlur = 0;

      // 4. Draw Ball
      const ball = ballRef.current;
      c.fillStyle = '#00ff88';
      c.beginPath();
      c.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 10;
      c.shadowColor = '#00ff88';
      c.beginPath();
      c.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      c.stroke();
      c.shadowBlur = 0;

      // 5. Blinking launch prompt overlay if not launched yet
      if (!isBallLaunchedRef.current && gameStateRef.current === 'GAMEPLAY') {
        c.textAlign = 'center';
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(50, 320, 500, 70);
        c.strokeStyle = 'rgba(0,212,255,0.15)';
        c.strokeRect(50, 320, 500, 70);

        const blinkState = Math.floor(time / 450) % 2 === 0;
        c.fillStyle = blinkState ? '#ffffff' : '#8888a0';
        c.font = 'bold 15px "Orbitron", monospace';
        c.fillText('PRESS SPACEBAR OR CLICK SCREEN TO DEFLECT BALL', CANVAS_SIZE / 2, 350);

        c.fillStyle = '#8888a0';
        c.font = '11px "Exo 2", sans-serif';
        c.fillText('MOVE MOUSE OR ARROW KEYS (A/D) TO CONTROL DEFLECTOR SHIELD', CANVAS_SIZE / 2, 375);
      }
    };

    // Helper: Draw global speaker mute toggler button
    const drawSpeakerIcon = (c) => {
      c.save();
      const x = 555;
      const y = 20;

      c.strokeStyle = muted ? '#ff0055' : '#8888a0';
      c.fillStyle = muted ? 'rgba(255,0,85,0.05)' : 'rgba(255,255,255,0.05)';
      c.lineWidth = 2;

      c.beginPath();
      c.moveTo(x, y + 6);
      c.lineTo(x + 6, y + 6);
      c.lineTo(x + 12, y);
      c.lineTo(x + 12, y + 16);
      c.lineTo(x + 6, y + 10);
      c.lineTo(x, y + 10);
      c.closePath();
      c.fill();
      c.stroke();

      if (!muted) {
        c.beginPath();
        c.arc(x + 10, y + 8, 5, -Math.PI / 3, Math.PI / 3);
        c.stroke();
        c.beginPath();
        c.arc(x + 10, y + 8, 9, -Math.PI / 3, Math.PI / 3);
        c.stroke();
      } else {
        c.strokeStyle = '#ff0055';
        c.beginPath();
        c.moveTo(x + 16, y + 3);
        c.lineTo(x + 22, y + 13);
        c.moveTo(x + 22, y + 3);
        c.lineTo(x + 16, y + 13);
        c.stroke();
      }
      c.restore();
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, level, lives, muted, submitStatus, rewards, highScore, menuIndex, isBallLaunched]);

  return (
    <div className="bb-page-wrapper">
      {/* Floating circular navigation button aligned vertically below logo */}
      {gameState === 'LOBBY' || gameState === 'GAMEOVER' || gameState === 'PAUSE' ? (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      ) : null}

      {gameState === 'GAMEPLAY' ? (
        <button
          onClick={() => {
            playSound('click', muted);
            setGameState('PAUSE');
            setMenuIndex(0);
          }}
          className="floating-back-btn"
          title="Pause Game"
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          <Pause size={20} />
        </button>
      ) : null}

      <div className="game-content-card">
        <div 
          className="cabinet-screen crt-screen" 
          onClick={handleCanvasClick} 
          onMouseMove={handleCanvasMouseMove}
        >
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', background: '#020205', width: '100%', height: 'auto', maxWidth: '600px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrickBreaker;
