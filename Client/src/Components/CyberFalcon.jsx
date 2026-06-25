import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import '../Css/CyberFalcon.css';

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
    } else if (type === 'thrust') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.025, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'point') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.5);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.6);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.warn("Audio Context init failed:", e);
  }
};

const CyberFalcon = () => {
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

  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('falcon_high_score') || '0', 10);
  });

  const [hasStarted, setHasStarted] = useState(false);
  const hasStartedRef = useRef(false);
  useEffect(() => { hasStartedRef.current = hasStarted; }, [hasStarted]);

  // Menu navigation index
  const [menuIndex, setMenuIndex] = useState(0);

  // API sync states
  const [gameId, setGameId] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('');
  const [rewards, setRewards] = useState(null);

  // Canvas Refs & loops
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  // Simulation physics parameters
  const shipRef = useRef({ x: 80, y: 300, vy: 0, radius: 12, gravity: 0.28, lift: -5.2 });
  const obstaclesRef = useRef([]);
  const particlesRef = useRef([]);
  const scrollDistanceRef = useRef(0);
  const speedRef = useRef(3.2);

  // Constants
  const CANVAS_SIZE = 600;
  const GAP_SIZE = 120;
  const SPAWN_DISTANCE = 250;

  // Retrieve game info
  useEffect(() => {
    axios.get('/api/v1/games')
      .then(res => {
        const game = res.data.games?.find(g => g.title === "Cyber Falcon");
        if (game) setGameId(game._id);
      })
      .catch(err => console.error("Failed to load game info:", err));
  }, []);

  // Submit high score
  const submitFalconScore = async (finalScore) => {
    const token = localStorage.getItem('token');
    if (gameId && token && finalScore > 0) {
      setSubmitStatus('submitting');
      try {
        const res = await axios.post(`/api/v1/games/${gameId}/score`, {
          score: finalScore
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

  // Launch fresh game
  const startGame = () => {
    setScore(0);
    setRewards(null);
    setSubmitStatus('');
    setMenuIndex(0);
    setHasStarted(false);

    shipRef.current.y = 300;
    shipRef.current.vy = 0;
    obstaclesRef.current = [];
    particlesRef.current = [];
    scrollDistanceRef.current = SPAWN_DISTANCE - 50; // trigger early obstacle spawn
    speedRef.current = 3.2;

    setGameState('GAMEPLAY');
  };

  // Jetpack thrust boost
  const triggerThrust = () => {
    if (gameStateRef.current !== 'GAMEPLAY') return;

    if (!hasStartedRef.current) {
      setHasStarted(true);
    }

    const ship = shipRef.current;
    ship.vy = ship.lift;
    playSound('thrust', mutedRef.current);

    // Spawn exhaust sparks
    for (let i = 0; i < 6; i++) {
      particlesRef.current.push({
        x: ship.x - 12,
        y: ship.y,
        vx: -3 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 3,
        alpha: 1,
        color: Math.random() > 0.5 ? '#ff007f' : '#00d4ff',
        size: 2 + Math.random() * 3
      });
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
      } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        triggerThrust();
      }
    }
  };

  // Keyboard listener hooks
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeStates = ['LOBBY', 'PAUSE', 'GAMEOVER', 'GAMEPLAY'];
      if (activeStates.includes(gameStateRef.current)) {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }
        handleKeyboardNav(e.code);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
      if (clickX >= 150 && clickX <= 450 && clickY >= 300 && clickY <= 360) {
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
      triggerThrust();
    }
  };

  // Spawn new obstacle
  const spawnPillar = () => {
    const obsWidth = 55;
    const minHeight = 40;
    // Total vertical playfield height is 480px (80 to 560)
    const maxHeight = 480 - GAP_SIZE - minHeight;
    const topHeight = Math.floor(minHeight + Math.random() * (maxHeight - minHeight));
    const bottomHeight = 480 - GAP_SIZE - topHeight;

    obstaclesRef.current.push({
      x: 600,
      width: obsWidth,
      top: topHeight,
      bottom: bottomHeight,
      passed: false
    });
  };

  // Main Canvas render & physics loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = (time) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      const dt = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;

      // Update Physics
      if (gameStateRef.current === 'GAMEPLAY' && hasStartedRef.current) {
        const ship = shipRef.current;
        const speed = speedRef.current;

        // Apply ship gravity
        ship.vy += ship.gravity;
        ship.y += ship.vy;

        // Ceil check (clamping)
        if (ship.y - ship.radius < 80) {
          ship.y = 80 + ship.radius;
          ship.vy = 0;
        }

        // Floor check (death)
        if (ship.y + ship.radius >= 560) {
          ship.y = 560 - ship.radius;
          playSound('crash', mutedRef.current);
          setGameState('GAMEOVER');
          setMenuIndex(0);
          playSound('gameover', mutedRef.current);
          submitFalconScore(scoreRef.current);
        }

        // Move Exhaust Particles
        particlesRef.current.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.04;
        });
        particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);

        // Scroll and check obstacles
        const obstacles = obstaclesRef.current;
        obstacles.forEach(obs => {
          obs.x -= speed;

          // Score check
          if (!obs.passed && obs.x + obs.width < ship.x) {
            obs.passed = true;
            playSound('point', mutedRef.current);
            setScore(prev => {
              const nextScore = prev + 1;
              if (nextScore > highScore) {
                localStorage.setItem('falcon_high_score', nextScore.toString());
                setHighScore(nextScore);
              }
              return nextScore;
            });

            // Increase speed slightly
            if (speedRef.current < 6.5) {
              speedRef.current += 0.08;
            }
          }
        });

        // Filter off-screen obstacles
        obstaclesRef.current = obstacles.filter(obs => obs.x + obs.width > 0);

        // Spawner check
        scrollDistanceRef.current += speed;
        if (scrollDistanceRef.current >= SPAWN_DISTANCE) {
          scrollDistanceRef.current -= SPAWN_DISTANCE;
          spawnPillar();
        }

        // Collision check
        for (let i = 0; i < obstaclesRef.current.length; i++) {
          const obs = obstaclesRef.current[i];
          if (ship.x + ship.radius > obs.x && ship.x - ship.radius < obs.x + obs.width) {
            if (
              ship.y - ship.radius < 80 + obs.top ||
              ship.y + ship.radius > 560 - obs.bottom
            ) {
              playSound('crash', mutedRef.current);
              setGameState('GAMEOVER');
              setMenuIndex(0);
              playSound('gameover', mutedRef.current);
              submitFalconScore(scoreRef.current);
              break;
            }
          }
        }
      }

      // Drawing
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.shadowBlur = 0;

      // Space lines
      ctx.strokeStyle = '#070b16';
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
        ctx.fillText('CYBER FALCON', CANVAS_SIZE / 2, 130);

        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#b4b4c8';
        ctx.font = '14px "Exo 2", sans-serif';
        ctx.fillText('NEON JETPACK SIMULATOR', CANVAS_SIZE / 2, 170);

        // Draw START RUN button centered
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_SIZE / 2 - 130, 330 - 28, 260, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px "Orbitron", monospace';
        ctx.fillText('START RUN', CANVAS_SIZE / 2, 330);

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
        ctx.fillText('GAME OVER', CANVAS_SIZE / 2, 100);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 20px "Orbitron", monospace';
        ctx.fillText(`CURRENT SCORE: ${scoreRef.current}`, CANVAS_SIZE / 2, 140);

        ctx.fillStyle = '#00ff88';
        ctx.fillText(`BEST SCORE: ${highScore}`, CANVAS_SIZE / 2, 170);



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

    // Helper: Draw exhaust particles, scrolling obstacles, HUD header, and jetpack ship
    const drawActiveGameElements = (c) => {
      // 1. Draw exhaust sparks
      particlesRef.current.forEach(p => {
        c.fillStyle = p.color;
        c.globalAlpha = p.alpha;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      });
      c.globalAlpha = 1.0; // reset

      // 2. Draw obstacles
      const obstacles = obstaclesRef.current;
      obstacles.forEach(obs => {
        c.fillStyle = 'rgba(255, 0, 127, 0.1)';
        c.strokeStyle = '#ff007f';
        c.lineWidth = 3;

        // Top pillar
        c.beginPath();
        c.roundRect(obs.x, 80 - 10, obs.width, obs.top + 10, [0, 0, 6, 6]);
        c.fill();
        c.stroke();

        // Bottom pillar
        c.beginPath();
        c.roundRect(obs.x, 560 - obs.bottom, obs.width, obs.bottom + 10, [6, 6, 0, 0]);
        c.fill();
        c.stroke();
      });

      // 3. Draw Jetpack Ship (Sleek vector triangle pointing right)
      const ship = shipRef.current;
      c.fillStyle = 'rgba(0, 212, 255, 0.2)';
      c.strokeStyle = '#00d4ff';
      c.lineWidth = 3;
      c.beginPath();

      const sy = ship.y;
      const sx = ship.x;
      const sr = ship.radius;

      c.moveTo(sx + sr + 4, sy); // nose
      c.lineTo(sx - sr, sy - sr + 2); // top back
      c.lineTo(sx - sr + 4, sy); // back indent
      c.lineTo(sx - sr, sy + sr - 2); // bottom back
      c.closePath();
      c.fill();
      c.stroke();

      // Exhaust flame spark glow
      c.fillStyle = '#ff007f';
      c.beginPath();
      c.arc(sx - sr, sy, 3.5, 0, Math.PI * 2);
      c.fill();

      c.shadowBlur = 10;
      c.shadowColor = '#00d4ff';
      c.beginPath();
      c.moveTo(sx + sr + 4, sy);
      c.lineTo(sx - sr, sy - sr + 2);
      c.lineTo(sx - sr + 4, sy);
      c.lineTo(sx - sr, sy + sr - 2);
      c.closePath();
      c.stroke();
      c.shadowBlur = 0;

      // 4. Draw HUD headers
      c.textAlign = 'left';
      c.fillStyle = '#8888a0';
      c.font = '11px "Orbitron", monospace';
      c.fillText('DISTANCE', 50, 30);
      c.fillText('BEST RECORD', 300, 30);

      c.fillStyle = '#ffffff';
      c.font = 'bold 16px "Orbitron", monospace';
      c.fillText(`${scoreRef.current} nodes`, 50, 52);

      c.fillStyle = '#ffd700';
      c.fillText(`${highScore} nodes`, 300, 52);

      // Bezel border line
      c.strokeStyle = 'rgba(0, 212, 255, 0.15)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(0, 78);
      c.lineTo(CANVAS_SIZE, 78);
      c.moveTo(0, 560);
      c.lineTo(CANVAS_SIZE, 560);
      c.stroke();

      // 5. Flashing prompt overlay when not started yet
      if (!hasStartedRef.current && gameStateRef.current === 'GAMEPLAY') {
        c.textAlign = 'center';
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(50, 320, 500, 70);
        c.strokeStyle = 'rgba(0,212,255,0.15)';
        c.strokeRect(50, 320, 500, 70);

        const blinkState = Math.floor(time / 450) % 2 === 0;
        c.fillStyle = blinkState ? '#ffffff' : '#8888a0';
        c.font = 'bold 15px "Orbitron", monospace';
        c.fillText('PRESS SPACEBAR OR CLICK SCREEN TO FLY SHIP', CANVAS_SIZE / 2, 350);

        c.fillStyle = '#8888a0';
        c.font = '11px "Exo 2", sans-serif';
        c.fillText('TAP REPEATEDLY TO HOVER THE FALCON THROUGH THE PIPES', CANVAS_SIZE / 2, 375);
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
  }, [gameState, muted, submitStatus, rewards, highScore, menuIndex, hasStarted]);

  return (
    <div className="falcon-page-wrapper">
      {/* Floating circular navigation button aligned vertically below logo */}
      {gameState === 'LOBBY' || gameState === 'GAMEOVER' || gameState === 'PAUSE' ? (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      ) : null}



      <div className="game-content-card">
        <div 
          className="cabinet-screen crt-screen" 
          onClick={handleCanvasClick}
        >
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', background: '#020205', width: '100%', height: 'auto', maxWidth: '850px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default CyberFalcon;
