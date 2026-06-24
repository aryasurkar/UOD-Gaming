import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import '../Css/TTT.css';

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
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'cpu') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'draw') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(293.66, now); // D4
      osc.frequency.setValueAtTime(293.66, now + 0.15);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.4);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn("Audio Context init failed:", e);
  }
};

const TTT = () => {
  const location = useLocation();
  const [gameId, setGameId] = useState(null);

  // Fetch Game Info
  useEffect(() => {
    if (location.state?.gameId) {
      setGameId(location.state.gameId);
    } else {
      axios.get('/api/v1/games')
        .then(res => {
          const game = res.data.games?.find(g => g.title === "Tic Tac Toe Duo");
          if (game) setGameId(game._id);
        })
        .catch(err => console.error("Failed to load game info:", err));
    }
  }, [location.state]);

  // Game States: 'LOBBY' | 'GAMEPLAY' | 'LEADERBOARD' | 'PAUSE' | 'GAMEOVER'
  const [gameState, setGameState] = useState('LOBBY');
  const gameStateRef = useRef('LOBBY');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Mode: 'duo' | 'cpu'
  const [gameMode, setGameMode] = useState('cpu');
  const gameModeRef = useRef('cpu');
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);

  // Scores
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  // API scores & rewards status
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting' | 'submitted' | 'failed' | 'offline'
  const [rewards, setRewards] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Menu items selection
  const [menuIndex, setMenuIndex] = useState(0);

  // Grid Selection Cursor (for keyboard controls)
  const [gridCursor, setGridCursor] = useState(4); // default center cell index (0-8)
  const gridCursorRef = useRef(4);
  useEffect(() => { gridCursorRef.current = gridCursor; }, [gridCursor]);

  // Canvas Refs & Game Board
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  // Board state: Array of 9 cells
  const [board, setBoard] = useState(Array(9).fill(''));
  const boardRef = useRef(Array(9).fill(''));
  useEffect(() => { boardRef.current = board; }, [board]);

  const [currentPlayer, setCurrentPlayer] = useState('X'); // X starts
  const currentPlayerRef = useRef('X');
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

  const [gameResult, setGameResult] = useState(''); // 'X wins' | 'O wins' | 'draw' | ''
  const gameResultRef = useRef('');
  useEffect(() => { gameResultRef.current = gameResult; }, [gameResult]);

  const [isCpuThinking, setIsCpuThinking] = useState(false);
  const isCpuThinkingRef = useRef(false);
  useEffect(() => { isCpuThinkingRef.current = isCpuThinking; }, [isCpuThinking]);

  // Constants
  const CANVAS_SIZE = 600;
  const CELL_SIZE = 160; // 3x3 grid size is 480px, centered
  const GRID_OFFSET = (CANVAS_SIZE - CELL_SIZE * 3) / 2; // 60px padding on each side

  // Fetch online leaderboard
  const fetchLeaderboard = async () => {
    if (!gameId) return;
    try {
      setLeaderboardLoading(true);
      const res = await axios.get(`/api/v1/leaderboard/game/${gameId}?limit=6`);
      setLeaderboard(res.data.leaderboardWithRanks || res.data.leaderboard || []);
    } catch (err) {
      console.error("Failed to load rankings:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (gameId && gameState === 'LEADERBOARD') {
      fetchLeaderboard();
    }
  }, [gameId, gameState]);

  // Submit high score
  const submitTttResult = async (scoreToSubmit) => {
    const token = localStorage.getItem('token');
    if (gameId && token) {
      setSubmitStatus('submitting');
      try {
        const res = await axios.post(`/api/v1/games/${gameId}/score`, {
          score: scoreToSubmit,
          level: gameMode === 'cpu' ? 2 : 1 // level 2 for CPU, 1 for local Duo
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

        // Sync local storage user profile coins
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
            console.error(e);
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

  // Start new game run
  const launchGameplay = (mode) => {
    setGameMode(mode);
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameResult('');
    setIsCpuThinking(false);
    setRewards(null);
    setSubmitStatus('');
    setGridCursor(4);
    setGameState('GAMEPLAY');
  };

  // Winning combinations check
  const checkWin = (b, p) => {
    const winCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diags
    ];
    return winCombos.some(combo => combo.every(idx => b[idx] === p));
  };

  const checkDraw = (b) => {
    return b.every(cell => cell !== '');
  };

  // Make move
  const makeMove = (index) => {
    if (boardRef.current[index] !== '' || gameResultRef.current !== '' || isCpuThinkingRef.current) return;

    const activePlayer = currentPlayerRef.current;
    playSound('move');

    const newBoard = [...boardRef.current];
    newBoard[index] = activePlayer;
    setBoard(newBoard);

    if (checkWin(newBoard, activePlayer)) {
      setGameResult(`${activePlayer} wins`);
      setGameState('GAMEOVER');
      setScores(prev => ({ ...prev, [activePlayer]: prev[activePlayer] + 1 }));
      playSound('win');
      
      // Submit score: 100 for win
      submitTttResult(activePlayer === 'X' ? 100 : 20); // Local player gets 100, CPU gets 20
      return;
    }

    if (checkDraw(newBoard)) {
      setGameResult('draw');
      setGameState('GAMEOVER');
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      playSound('draw');
      submitTttResult(50); // 50 for draw
      return;
    }

    // Switch turns
    const nextPlayer = activePlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);

    // Trigger CPU move if applicable
    if (gameModeRef.current === 'cpu' && nextPlayer === 'O') {
      setIsCpuThinking(true);
      setTimeout(() => {
        runCpuMove(newBoard);
      }, 600);
    }
  };

  // Minimax or simple smart CPU AI
  const runCpuMove = (currentBoard) => {
    let index = -1;

    // 1. Can CPU (O) win in 1 move?
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === '') {
        const testBoard = [...currentBoard];
        testBoard[i] = 'O';
        if (checkWin(testBoard, 'O')) {
          index = i;
          break;
        }
      }
    }

    // 2. Can Player (X) win in 1 move? Block them!
    if (index === -1) {
      for (let i = 0; i < 9; i++) {
        if (currentBoard[i] === '') {
          const testBoard = [...currentBoard];
          testBoard[i] = 'X';
          if (checkWin(testBoard, 'X')) {
            index = i;
            break;
          }
        }
      }
    }

    // 3. Take center if free
    if (index === -1 && currentBoard[4] === '') {
      index = 4;
    }

    // 4. Take random corner
    if (index === -1) {
      const corners = [0, 2, 6, 8].filter(i => currentBoard[i] === '');
      if (corners.length > 0) {
        index = corners[Math.floor(Math.random() * corners.length)];
      }
    }

    // 5. Take random side
    if (index === -1) {
      const sides = [1, 3, 5, 7].filter(i => currentBoard[i] === '');
      if (sides.length > 0) {
        index = sides[Math.floor(Math.random() * sides.length)];
      }
    }

    if (index !== -1) {
      playSound('cpu');
      const newBoard = [...currentBoard];
      newBoard[index] = 'O';
      setBoard(newBoard);
      setIsCpuThinking(false);

      if (checkWin(newBoard, 'O')) {
        setGameResult('O wins');
        setGameState('GAMEOVER');
        setScores(prev => ({ ...prev, O: prev.O + 1 }));
        playSound('fail');
        submitTttResult(10); // Player gets 10 on CPU win
        return;
      }

      if (checkDraw(newBoard)) {
        setGameResult('draw');
        setGameState('GAMEOVER');
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        playSound('draw');
        submitTttResult(50);
        return;
      }

      setCurrentPlayer('X');
    } else {
      setIsCpuThinking(false);
    }
  };

  // Keyboard Navigation Controls
  const handleKeyboardNav = (code) => {
    const curState = gameStateRef.current;
    if (curState === 'LOBBY') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click');
        setMenuIndex(prev => (prev === 0 ? 2 : prev - 1));
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click');
        setMenuIndex(prev => (prev === 2 ? 0 : prev + 1));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click');
        if (menuIndex === 0) {
          launchGameplay('cpu');
        } else if (menuIndex === 1) {
          launchGameplay('duo');
        } else if (menuIndex === 2) {
          setGameState('LEADERBOARD');
        }
      }
    } else if (curState === 'LEADERBOARD') {
      if (code === 'Space' || code === 'Enter' || code === 'Escape') {
        playSound('click');
        setGameState('LOBBY');
        setMenuIndex(2);
      }
    } else if (curState === 'PAUSE') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click');
        setMenuIndex(prev => (prev === 0 ? 2 : prev - 1));
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click');
        setMenuIndex(prev => (prev === 2 ? 0 : prev + 1));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click');
        if (menuIndex === 0) {
          setGameState('GAMEPLAY');
        } else if (menuIndex === 1) {
          launchGameplay(gameModeRef.current);
        } else if (menuIndex === 2) {
          setGameState('LOBBY');
          setMenuIndex(0);
        }
      } else if (code === 'Escape') {
        playSound('click');
        setGameState('GAMEPLAY');
      }
    } else if (curState === 'GAMEOVER') {
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowDown' || code === 'KeyS') {
        playSound('click');
        setMenuIndex(prev => (prev === 0 ? 1 : 0));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click');
        if (menuIndex === 0) {
          launchGameplay(gameModeRef.current);
        } else {
          setGameState('LOBBY');
          setMenuIndex(0);
        }
      }
    } else if (curState === 'GAMEPLAY') {
      if (code === 'Escape') {
        playSound('click');
        setGameState('PAUSE');
        setMenuIndex(0);
      }

      // Grid cursor navigation
      let row = Math.floor(gridCursorRef.current / 3);
      let col = gridCursorRef.current % 3;

      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click');
        row = row === 0 ? 2 : row - 1;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click');
        row = row === 2 ? 0 : row + 1;
      } else if (code === 'ArrowLeft' || code === 'KeyA') {
        playSound('click');
        col = col === 0 ? 2 : col - 1;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        playSound('click');
        col = col === 2 ? 0 : col + 1;
      } else if (code === 'Space' || code === 'Enter') {
        makeMove(row * 3 + col);
      }

      setGridCursor(row * 3 + col);
    }
  };

  // Keyboard Listener hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeStates = ['LOBBY', 'LEADERBOARD', 'PAUSE', 'GAMEOVER', 'GAMEPLAY'];
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

  // Mouse hover & click triggers on Canvas
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get click coords relative to canvas
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const curState = gameState;
    if (curState === 'LOBBY') {
      // VS COMPUTER
      if (clickX >= 150 && clickX <= 450 && clickY >= 280 && clickY <= 320) {
        playSound('click');
        launchGameplay('cpu');
      }
      // DUO COMBAT
      else if (clickX >= 150 && clickX <= 450 && clickY >= 340 && clickY <= 380) {
        playSound('click');
        launchGameplay('duo');
      }
      // LEADERBOARD
      else if (clickX >= 150 && clickX <= 450 && clickY >= 400 && clickY <= 440) {
        playSound('click');
        setGameState('LEADERBOARD');
      }
    } else if (curState === 'LEADERBOARD') {
      if (clickX >= 180 && clickX <= 420 && clickY >= 490 && clickY <= 530) {
        playSound('click');
        setGameState('LOBBY');
        setMenuIndex(2);
      }
    } else if (curState === 'PAUSE') {
      // RESUME
      if (clickX >= 200 && clickX <= 400 && clickY >= 240 && clickY <= 280) {
        playSound('click');
        setGameState('GAMEPLAY');
      }
      // RESTART
      else if (clickX >= 200 && clickX <= 400 && clickY >= 300 && clickY <= 340) {
        playSound('click');
        launchGameplay(gameMode);
      }
      // EXIT
      else if (clickX >= 200 && clickX <= 400 && clickY >= 360 && clickY <= 400) {
        playSound('click');
        setGameState('LOBBY');
        setMenuIndex(0);
      }
    } else if (curState === 'GAMEOVER') {
      // REMATCH
      if (clickX >= 150 && clickX <= 450 && clickY >= 450 && clickY <= 490) {
        playSound('click');
        launchGameplay(gameMode);
      }
      // QUIT TO MENU
      else if (clickX >= 150 && clickX <= 450 && clickY >= 505 && clickY <= 545) {
        playSound('click');
        setGameState('LOBBY');
        setMenuIndex(0);
      }
    } else if (curState === 'GAMEPLAY') {
      // Check if clicked inside grid cell
      for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = GRID_OFFSET + col * CELL_SIZE;
        const y = GRID_OFFSET + row * CELL_SIZE;

        if (clickX >= x && clickX <= x + CELL_SIZE && clickY >= y && clickY <= y + CELL_SIZE) {
          makeMove(i);
          break;
        }
      }
    }
  };

  // Main rendering loop hook
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.shadowBlur = 0;

      // Draw background space gridlines
      ctx.strokeStyle = '#060a16';
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
        ctx.fillText('NEON DUO COMBAT', CANVAS_SIZE / 2, 130);

        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#b4b4c8';
        ctx.font = '14px "Exo 2", sans-serif';
        ctx.fillText('CROSS-GRID TIC TAC TOE ARCADE', CANVAS_SIZE / 2, 170);

        const menuItems = [
          'VS COMPUTER',
          'DUO COMBAT',
          'SYSTEM RANKINGS'
        ];

        menuItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 300 + idx * 60;

          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_SIZE / 2 - 180, y - 28, 360, 40);

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
        ctx.fillStyle = '#8888a0';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.fillText('USE ARROWS / WASD TO NAVIGATE • SPACEBAR TO SELECT', CANVAS_SIZE / 2, 550);
      }

      // ----------------------------------------------------
      // STATE: LEADERBOARD
      // ----------------------------------------------------
      else if (curState === 'LEADERBOARD') {
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 28px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('COMBAT RANKINGS', CANVAS_SIZE / 2, 90);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8888a0';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.fillText('TOP NEON COMBAT RATING', CANVAS_SIZE / 2, 120);

        // Draw Headers
        ctx.fillStyle = '#b4b4c8';
        ctx.font = 'bold 13px "Orbitron", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('RANK', 100, 170);
        ctx.fillText('PLAYER ID', 170, 170);
        ctx.textAlign = 'right';
        ctx.fillText('RATING', 500, 170);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 185);
        ctx.lineTo(500, 185);
        ctx.stroke();

        if (leaderboardLoading) {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#8888a0';
          ctx.font = '14px "Exo 2", sans-serif';
          ctx.fillText('QUERYING NET NODES...', CANVAS_SIZE / 2, 280);
        } else {
          const list = leaderboard.length > 0 ? leaderboard : [
            { username: "CYBER_NINJA", score: 800 },
            { username: "NEON_RIDER", score: 710 },
            { username: "RETRO_BOY", score: 620 },
            { username: "GRID_RUNNER", score: 550 },
            { username: "TTT_GOD", score: 480 }
          ];

          list.slice(0, 6).forEach((entry, idx) => {
            const y = 215 + idx * 40;
            ctx.font = '14px "Orbitron", monospace';
            ctx.textAlign = 'left';
            ctx.fillStyle = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : '#b4b4c8';
            ctx.fillText(String(idx + 1).padStart(2, '0'), 100, y);
            ctx.fillText(entry.username || (entry.user && entry.user.username) || "PLAYER", 170, y);
            ctx.textAlign = 'right';
            ctx.fillText(String(entry.score), 500, y);
          });
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d4ff';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_SIZE / 2 - 120, 480, 240, 40);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Orbitron", monospace';
        ctx.fillText('BACK TO MENU', CANVAS_SIZE / 2, 505);
      }

      // ----------------------------------------------------
      // STATE: PAUSE
      // ----------------------------------------------------
      else if (curState === 'PAUSE') {
        drawBoard(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.85)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff007f';
        ctx.font = 'bold 36px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM PAUSED', CANVAS_SIZE / 2, 160);

        const pauseItems = ['RESUME', 'RESTART', 'QUIT TO MENU'];
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
        drawBoard(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.88)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 34px "Orbitron", monospace';
        ctx.textAlign = 'center';

        let resultTitle = 'COMBAT DRAW';
        if (gameResultRef.current === 'X wins') {
          resultTitle = 'PLAYER X WINS!';
          ctx.shadowColor = '#00d4ff';
          ctx.fillStyle = '#00d4ff';
        } else if (gameResultRef.current === 'O wins') {
          resultTitle = gameModeRef.current === 'cpu' ? 'CYBER CPU WINS!' : 'PLAYER O WINS!';
          ctx.shadowColor = '#ff007f';
          ctx.fillStyle = '#ff007f';
        }
        ctx.fillText(resultTitle, CANVAS_SIZE / 2, 110);

        // Terminal style rewards logs
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(80, 160, 440, 230);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.strokeRect(80, 160, 440, 230);

        ctx.font = '13px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`> Combat session closed.`, 100, 190);
        ctx.fillText(`> Match Result: ${gameResultRef.current.toUpperCase()}`, 100, 210);

        if (submitStatus === 'submitting') {
          ctx.fillStyle = '#00d4ff';
          ctx.fillText(`> Saving combat data to cloud network...`, 100, 240);
          ctx.fillText(`> Synching transaction logs...`, 100, 260);
        } else if (submitStatus === 'submitted' && rewards) {
          ctx.fillStyle = '#00ff88';
          ctx.fillText(`> DATA UPLOADED AND VERIFIED.`, 100, 240);
          ctx.fillStyle = '#ffd700';
          ctx.fillText(`> REWARDS CREDITED:`, 100, 270);
          ctx.fillText(`  🪙 +${rewards.coinsEarned} Arcade Coins`, 100, 290);
          ctx.fillText(`  ⚡ +${rewards.expGained} Experience Nodes`, 100, 310);
          if (rewards.leveledUp) {
            ctx.fillStyle = '#ff007f';
            ctx.fillText(`  [NOTICE] LEVEL UP! New Level ${rewards.level}`, 100, 335);
          }
        } else if (submitStatus === 'failed') {
          ctx.fillStyle = '#ff0055';
          ctx.fillText(`> [ERROR] CONNECTION FAILURE`, 100, 240);
          ctx.fillText(`> Unable to save highscore.`, 100, 260);
        } else if (submitStatus === 'offline') {
          ctx.fillStyle = '#ffaa00';
          ctx.fillText(`> [NOTICE] OFFLINE SESSION`, 100, 240);
          ctx.fillText(`> Authenticated player not found.`, 100, 260);
          ctx.fillText(`> Log in to earn coins next match!`, 100, 280);
        }

        // Action Options
        const gameOverItems = ['PLAY AGAIN', 'QUIT TO MENU'];
        gameOverItems.forEach((text, idx) => {
          const isSelected = menuIndex === idx;
          const y = 470 + idx * 55;

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
        drawBoard(ctx);
      }

      requestRef.current = requestAnimationFrame(render);
    };

    // Helper to draw board grid and cells
    const drawBoard = (c) => {
      const grid = boardRef.current;

      // 1. Draw glowing 3x3 grid borders
      c.shadowColor = '#00d4ff';
      c.shadowBlur = 10;
      c.strokeStyle = '#00d4ff';
      c.lineWidth = 4;

      // Vertical lines
      c.beginPath();
      c.moveTo(GRID_OFFSET + CELL_SIZE, GRID_OFFSET);
      c.lineTo(GRID_OFFSET + CELL_SIZE, CANVAS_SIZE - GRID_OFFSET);
      c.moveTo(GRID_OFFSET + CELL_SIZE * 2, GRID_OFFSET);
      c.lineTo(GRID_OFFSET + CELL_SIZE * 2, CANVAS_SIZE - GRID_OFFSET);
      // Horizontal lines
      c.moveTo(GRID_OFFSET, GRID_OFFSET + CELL_SIZE);
      c.lineTo(CANVAS_SIZE - GRID_OFFSET, GRID_OFFSET + CELL_SIZE);
      c.moveTo(GRID_OFFSET, GRID_OFFSET + CELL_SIZE * 2);
      c.lineTo(CANVAS_SIZE - GRID_OFFSET, GRID_OFFSET + CELL_SIZE * 2);
      c.stroke();

      // 2. Draw active cell marks
      grid.forEach((mark, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = GRID_OFFSET + col * CELL_SIZE + CELL_SIZE / 2;
        const y = GRID_OFFSET + row * CELL_SIZE + CELL_SIZE / 2;

        if (mark === 'X') {
          // Cyan 'X'
          c.shadowColor = '#00d4ff';
          c.shadowBlur = 15;
          c.strokeStyle = '#00d4ff';
          c.lineWidth = 12;
          c.beginPath();
          c.moveTo(x - 35, y - 35);
          c.lineTo(x + 35, y + 35);
          c.moveTo(x + 35, y - 35);
          c.lineTo(x - 35, y + 35);
          c.stroke();
        } else if (mark === 'O') {
          // Pink 'O'
          c.shadowColor = '#ff007f';
          c.shadowBlur = 15;
          c.strokeStyle = '#ff007f';
          c.lineWidth = 12;
          c.beginPath();
          c.arc(x, y, 35, 0, Math.PI * 2);
          c.stroke();
        }
      });

      // 3. Draw grid cursor overlay (if in GAMEPLAY and X turn)
      if (gameStateRef.current === 'GAMEPLAY' && !(gameModeRef.current === 'cpu' && currentPlayerRef.current === 'O')) {
        const cursor = gridCursorRef.current;
        const row = Math.floor(cursor / 3);
        const col = cursor % 3;
        const x = GRID_OFFSET + col * CELL_SIZE;
        const y = GRID_OFFSET + row * CELL_SIZE;

        c.shadowColor = '#00d4ff';
        c.shadowBlur = 8;
        c.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        c.lineWidth = 2;
        c.strokeRect(x + 6, y + 6, CELL_SIZE - 12, CELL_SIZE - 12);
      }
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, menuIndex, gridCursor, leaderboard, leaderboardLoading, board, currentPlayer, gameMode, submitStatus, rewards]);

  return (
    <div className="ttt-container">
      {/* Centered Logo-Aligned Floating Circular Back Button */}
      {gameState === 'LOBBY' || gameState === 'LEADERBOARD' || gameState === 'GAMEOVER' || gameState === 'PAUSE' ? (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      ) : null}

      <div className="game-content-card">
        <div className="cabinet-screen crt-screen" onClick={handleCanvasClick}>
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          {/* HUD Scoreboard Strip */}
          {gameState === 'GAMEPLAY' && (
            <div className="game-hud-container">
              <div className="game-hud-item">
                <span className="game-hud-label">Player X</span>
                <span className="game-hud-value" style={{ color: 'var(--primary-neon)' }}>{scores.X}</span>
              </div>
              <div className="game-hud-item">
                <span className="game-hud-label">
                  {isCpuThinking ? 'Thinking...' : `Turn: Player ${currentPlayer}`}
                </span>
                <span className="game-hud-value" style={{ fontSize: '0.9rem', color: '#8888a0' }}>
                  {gameMode === 'cpu' ? 'VS CPU' : 'DUO'}
                </span>
              </div>
              <div className="game-hud-item">
                <span className="game-hud-label">Player O</span>
                <span className="game-hud-value" style={{ color: 'var(--secondary-neon)' }}>{scores.O}</span>
              </div>
            </div>
          )}

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

export default TTT;