import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Pause } from 'lucide-react';
import axios from 'axios';
import '../Css/MemoryCard.css';

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
    } else if (type === 'flip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.12);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'match') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'mismatch') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.5);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.6);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'tick') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    }
  } catch (e) {
    console.warn("Audio Context init failed:", e);
  }
};

const NEON_DECK = ['Zap', 'Flame', 'Trophy', 'Star', 'Gamepad2', 'Heart', 'Eye', 'Music', 'Anchor', 'Crown', 'Moon', 'Bomb'];
const EMOJI_DECK = ['👾', '🚀', '💎', '🍕', '👑', '👽', '🦄', '🎸', '🦖', '🎈', '⚽', '🍔'];

// Custom Neon Vector Drawing functions centered at (x, y)
const drawSymbolMap = {
  Zap: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + size / 4, y - size / 2);
    ctx.lineTo(x - size / 3, y + size / 12);
    ctx.lineTo(x + size / 12, y + size / 12);
    ctx.lineTo(x - size / 4, y + size / 2);
    ctx.lineTo(x + size / 3, y - size / 12);
    ctx.lineTo(x - size / 12, y - size / 12);
    ctx.closePath();
    ctx.stroke();
  },
  Flame: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + size / 2);
    ctx.quadraticCurveTo(x - size / 2, y + size / 4, x - size / 4, y - size / 6);
    ctx.quadraticCurveTo(x, y - size / 2, x, y - size / 2.5);
    ctx.quadraticCurveTo(x + size / 6, y - size / 2, x + size / 6, y - size / 6);
    ctx.quadraticCurveTo(x + size / 2, y + size / 4, x, y + size / 2);
    ctx.closePath();
    ctx.stroke();
  },
  Trophy: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - size / 3, y - size / 3);
    ctx.lineTo(x + size / 3, y - size / 3);
    ctx.lineTo(x + size / 4, y + size / 8);
    ctx.lineTo(x - size / 4, y + size / 8);
    ctx.closePath();
    ctx.stroke();
    // Stand
    ctx.beginPath();
    ctx.moveTo(x, y + size / 8);
    ctx.lineTo(x, y + size / 2.5);
    ctx.moveTo(x - size / 4, y + size / 2.5);
    ctx.lineTo(x + size / 4, y + size / 2.5);
    ctx.stroke();
  },
  Star: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const r = i % 2 === 0 ? size / 2 : size / 4;
      ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.stroke();
  },
  Gamepad2: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Simple controller shape rounded rect
    ctx.roundRect(x - size / 2, y - size / 4, size, size / 2, 6);
    ctx.stroke();
    // D-pad
    ctx.beginPath();
    ctx.moveTo(x - size / 3, y);
    ctx.lineTo(x - size / 6, y);
    ctx.moveTo(x - size / 4, y - size / 12);
    ctx.lineTo(x - size / 4, y + size / 12);
    ctx.stroke();
    // Buttons
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + size / 4, y - size / 12, 2.5, 0, Math.PI * 2);
    ctx.arc(x + size / 3, y + size / 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  },
  Heart: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + size / 6);
    ctx.bezierCurveTo(x - size / 2, y - size / 4, x - size / 4, y - size / 2, x, y - size / 6);
    ctx.bezierCurveTo(x + size / 4, y - size / 2, x + size / 2, y - size / 4, x, y + size / 6);
    ctx.closePath();
    ctx.stroke();
  },
  Eye: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y);
    ctx.quadraticCurveTo(x, y - size / 3, x + size / 2, y);
    ctx.quadraticCurveTo(x, y + size / 3, x - size / 2, y);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, size / 6, 0, Math.PI * 2);
    ctx.stroke();
  },
  Music: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    // Music note body
    ctx.beginPath();
    ctx.arc(x - size / 6, y + size / 6, size / 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - size / 24, y - size / 3);
    ctx.lineTo(x - size / 24, y + size / 6);
    ctx.stroke();
    // flag
    ctx.beginPath();
    ctx.moveTo(x - size / 24, y - size / 3);
    ctx.quadraticCurveTo(x + size / 6, y - size / 4, x + size / 8, y - size / 12);
    ctx.stroke();
  },
  Anchor: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x, y + size / 4);
    ctx.stroke();
    // crossbar
    ctx.beginPath();
    ctx.moveTo(x - size / 4, y - size / 6);
    ctx.lineTo(x + size / 4, y - size / 6);
    ctx.stroke();
    // curve
    ctx.beginPath();
    ctx.arc(x, y, size / 2.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  },
  Crown: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - size / 2, y + size / 3);
    ctx.lineTo(x - size / 2, y - size / 6);
    ctx.lineTo(x - size / 4, y + size / 12);
    ctx.lineTo(x, y - size / 3);
    ctx.lineTo(x + size / 4, y + size / 12);
    ctx.lineTo(x + size / 2, y - size / 6);
    ctx.lineTo(x + size / 2, y + size / 3);
    ctx.closePath();
    ctx.stroke();
  },
  Moon: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - size / 8, y, size / 2.2, -Math.PI / 2, Math.PI / 2, false);
    ctx.arc(x + size / 8, y, size / 2.2, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.stroke();
  },
  Bomb: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    // Bomb body
    ctx.beginPath();
    ctx.arc(x, y + size / 8, size / 2.5, 0, Math.PI * 2);
    ctx.stroke();
    // fuse
    ctx.beginPath();
    ctx.moveTo(x + size / 4, y - size / 4);
    ctx.quadraticCurveTo(x + size / 2, y - size / 2, x + size / 2.5, y - size / 2.5);
    ctx.stroke();
    // spark dot
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + size / 2.5 - 2, y - size / 2.5 - 2, 4, 4);
  }
};

const MemoryCard = () => {
  // Game state configurations
  const [difficulty, setDifficulty] = useState('medium'); // easy, medium, hard
  const [deckType, setDeckType] = useState('neon'); // neon, emoji
  const [timeTrial, setTimeTrial] = useState(false);
  const [muted, setMuted] = useState(() => localStorage.getItem('arcade_muted') === 'true');

  const difficultyRef = useRef('medium');
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  const deckTypeRef = useRef('neon');
  useEffect(() => { deckTypeRef.current = deckType; }, [deckType]);
  const timeTrialRef = useRef(false);
  useEffect(() => { timeTrialRef.current = timeTrial; }, [timeTrial]);
  const mutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
    localStorage.setItem('arcade_muted', muted.toString());
  }, [muted]);

  // Screen State: 'LOBBY' | 'GAMEPLAY' | 'PAUSE' | 'GAMEOVER'
  const [gameState, setGameState] = useState('LOBBY');
  const gameStateRef = useRef('LOBBY');
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Game metrics
  const [moves, setMoves] = useState(0);
  const movesRef = useRef(0);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  const [matches, setMatches] = useState(0);
  const matchesRef = useRef(0);
  useEffect(() => { matchesRef.current = matches; }, [matches]);

  const [bestMoves, setBestMoves] = useState('-');
  const [gameResult, setGameResult] = useState(''); // 'win' | 'lose' | ''
  const gameResultRef = useRef('');
  useEffect(() => { gameResultRef.current = gameResult; }, [gameResult]);

  // Card deck arrays
  const [cards, setCards] = useState([]);
  const cardsRef = useRef([]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  const [flippedIndices, setFlippedIndices] = useState([]);
  const flippedIndicesRef = useRef([]);
  useEffect(() => { flippedIndicesRef.current = flippedIndices; }, [flippedIndices]);

  // API sync states
  const [gameId, setGameId] = useState(null);
  const [submitStatus, setSubmitStatus] = useState('');
  const [rewards, setRewards] = useState(null);

  // Menu navigation index (Lobby settings grid)
  const [menuRow, setMenuRow] = useState(0); // 0: Difficulty, 1: Deck, 2: TimeTrial, 3: Sound, 4: Launch
  const [menuCol, setMenuCol] = useState(0);

  // Gameplay Cursor (card indices)
  const [gridCursor, setGridCursor] = useState(0);
  const gridCursorRef = useRef(0);
  useEffect(() => { gridCursorRef.current = gridCursor; }, [gridCursor]);

  // Canvas Refs & Time ticks
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const lastFrameTimeRef = useRef(0);

  const initialLimitRef = useRef(60);
  const timeLeftRef = useRef(60000);
  const timerElapsedRef = useRef(0);
  const isTimerRunningRef = useRef(false);
  const lastTickSecondRef = useRef(-1);

  // Constants
  const CANVAS_SIZE = 600;

  // Retrieve Best Record from Storage
  const loadBestRecord = () => {
    const key = `memory_best_${difficultyRef.current}_${deckTypeRef.current}_${timeTrialRef.current ? 'trial' : 'normal'}`;
    const saved = localStorage.getItem(key);
    setBestMoves(saved ? saved : '-');
  };

  useEffect(() => {
    loadBestRecord();
  }, [difficulty, deckType, timeTrial, gameState]);

  // Load game info from db
  useEffect(() => {
    axios.get('/api/v1/games')
      .then(res => {
        const game = res.data.games?.find(g => g.title === "Memory Card Match");
        if (game) setGameId(game._id);
      })
      .catch(err => console.error("Failed to load game info:", err));
  }, []);

  // Submit high score
  const submitMemoryScore = async (finalMoves) => {
    const token = localStorage.getItem('token');
    if (gameId && token) {
      setSubmitStatus('submitting');
      try {
        const elapsedSecs = Math.floor(timerElapsedRef.current / 1000);
        const baseScore = difficultyRef.current === 'easy' ? 500 : difficultyRef.current === 'medium' ? 1000 : 2000;
        const calculatedScore = Math.max(50, baseScore - finalMoves * 10 - elapsedSecs * 2);

        const res = await axios.post(`/api/v1/games/${gameId}/score`, {
          score: calculatedScore,
          level: difficultyRef.current === 'easy' ? 1 : difficultyRef.current === 'medium' ? 2 : 3
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

        // Sync local storage user profile
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

  // Start new gameplay session
  const startGame = () => {
    let pairsCount = 8; // medium
    if (difficultyRef.current === 'easy') pairsCount = 4;
    else if (difficultyRef.current === 'hard') pairsCount = 12;

    const baseDeck = deckTypeRef.current === 'neon' ? NEON_DECK : EMOJI_DECK;
    const selectedPairs = baseDeck.slice(0, pairsCount);
    const duplicateDeck = [...selectedPairs, ...selectedPairs];

    // Shuffle
    const shuffled = duplicateDeck
      .map((icon, idx) => ({ id: idx, icon, isMatched: false, flipProgress: 0 }))
      .sort(() => Math.random() - 0.5);

    // Initial limit values
    let limit = 60;
    if (difficultyRef.current === 'easy') limit = 30;
    else if (difficultyRef.current === 'hard') limit = 45;

    initialLimitRef.current = limit;
    timeLeftRef.current = limit * 1000;
    timerElapsedRef.current = 0;
    isTimerRunningRef.current = true;
    lastTickSecondRef.current = -1;

    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setGameResult('');
    setRewards(null);
    setSubmitStatus('');
    setGridCursor(0);
    setGameState('GAMEPLAY');
  };

  // Card Flip Activations
  const handleCardFlip = (index) => {
    if (gameStateRef.current !== 'GAMEPLAY') return;
    const currentCards = cardsRef.current;
    const currentFlipped = flippedIndicesRef.current;

    // Ignore clicks if matches, already flipped, or processing a pair mismatch
    if (currentCards[index].isMatched || currentFlipped.includes(index) || currentFlipped.length >= 2) {
      return;
    }

    playSound('flip', mutedRef.current);
    const nextFlipped = [...currentFlipped, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMovesCount = movesRef.current + 1;
      setMoves(nextMovesCount);

      const [firstIdx, secondIdx] = nextFlipped;
      if (currentCards[firstIdx].icon === currentCards[secondIdx].icon) {
        // MATCH FOUND
        setTimeout(() => {
          if (gameStateRef.current !== 'GAMEPLAY') return;
          playSound('match', mutedRef.current);

          setCards(prev => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;
            return updated;
          });

          const totalPairs = difficultyRef.current === 'easy' ? 4 : difficultyRef.current === 'medium' ? 8 : 12;
          const nextMatches = matchesRef.current + 1;
          setMatches(nextMatches);

          if (nextMatches === totalPairs) {
            // Victory Loop
            isTimerRunningRef.current = false;
            playSound('win', mutedRef.current);
            setGameResult('win');
            setGameState('GAMEOVER');
            setMenuIndex(0);

            // Record Best
            const key = `memory_best_${difficultyRef.current}_${deckTypeRef.current}_${timeTrialRef.current ? 'trial' : 'normal'}`;
            const currentBest = localStorage.getItem(key);
            if (!currentBest || nextMovesCount < parseInt(currentBest, 10)) {
              localStorage.setItem(key, nextMovesCount.toString());
              setBestMoves(nextMovesCount);
            }

            submitMemoryScore(nextMovesCount);
          }
          setFlippedIndices([]);
        }, 500);
      } else {
        // MISMATCH
        setTimeout(() => {
          if (gameStateRef.current !== 'GAMEPLAY') return;
          playSound('mismatch', mutedRef.current);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Keyboard navigation controls
  const handleKeyboardNav = (code) => {
    const curState = gameStateRef.current;
    if (curState === 'LOBBY') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click', mutedRef.current);
        setMenuRow(prev => (prev === 0 ? 4 : prev - 1));
        setMenuCol(0);
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click', mutedRef.current);
        setMenuRow(prev => (prev === 4 ? 0 : prev + 1));
        setMenuCol(0);
      } else if (code === 'ArrowLeft' || code === 'KeyA') {
        playSound('click', mutedRef.current);
        if (menuRow === 0) {
          // Difficulty: easy, medium, hard
          setDifficulty(prev => {
            const next = prev === 'easy' ? 'hard' : prev === 'medium' ? 'easy' : 'medium';
            difficultyRef.current = next;
            return next;
          });
        } else if (menuRow === 1) {
          setDeckType(prev => {
            const next = prev === 'neon' ? 'emoji' : 'neon';
            deckTypeRef.current = next;
            return next;
          });
        } else if (menuRow === 2) {
          setTimeTrial(prev => {
            timeTrialRef.current = !prev;
            return !prev;
          });
        } else if (menuRow === 3) {
          setMuted(prev => {
            mutedRef.current = !prev;
            return !prev;
          });
        }
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        playSound('click', mutedRef.current);
        if (menuRow === 0) {
          setDifficulty(prev => {
            const next = prev === 'easy' ? 'medium' : prev === 'medium' ? 'hard' : 'easy';
            difficultyRef.current = next;
            return next;
          });
        } else if (menuRow === 1) {
          setDeckType(prev => {
            const next = prev === 'neon' ? 'emoji' : 'neon';
            deckTypeRef.current = next;
            return next;
          });
        } else if (menuRow === 2) {
          setTimeTrial(prev => {
            timeTrialRef.current = !prev;
            return !prev;
          });
        } else if (menuRow === 3) {
          setMuted(prev => {
            mutedRef.current = !prev;
            return !prev;
          });
        }
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        if (menuRow === 4) {
          startGame();
        } else if (menuRow === 2) {
          setTimeTrial(prev => {
            timeTrialRef.current = !prev;
            return !prev;
          });
        } else if (menuRow === 3) {
          setMuted(prev => {
            mutedRef.current = !prev;
            return !prev;
          });
        }
      }
    } else if (curState === 'PAUSE') {
      if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('click', mutedRef.current);
        setMenuCol(prev => (prev === 0 ? 2 : prev - 1)); // repurpose menuCol as list index
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('click', mutedRef.current);
        setMenuCol(prev => (prev === 2 ? 0 : prev + 1));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        if (menuCol === 0) {
          lastFrameTimeRef.current = performance.now();
          isTimerRunningRef.current = true;
          setGameState('GAMEPLAY');
        } else if (menuCol === 1) {
          startGame();
        } else {
          setGameState('LOBBY');
          setMenuRow(0);
          setMenuCol(0);
        }
      } else if (code === 'Escape') {
        playSound('click', mutedRef.current);
        lastFrameTimeRef.current = performance.now();
        isTimerRunningRef.current = true;
        setGameState('GAMEPLAY');
      }
    } else if (curState === 'GAMEOVER') {
      if (code === 'ArrowUp' || code === 'KeyW' || code === 'ArrowDown' || code === 'KeyS') {
        playSound('click', mutedRef.current);
        setMenuCol(prev => (prev === 0 ? 1 : 0));
      } else if (code === 'Space' || code === 'Enter') {
        playSound('click', mutedRef.current);
        if (menuCol === 0) {
          startGame();
        } else {
          setGameState('LOBBY');
          setMenuRow(0);
          setMenuCol(0);
        }
      }
    } else if (curState === 'GAMEPLAY') {
      if (code === 'Escape') {
        playSound('click', mutedRef.current);
        isTimerRunningRef.current = false;
        setGameState('PAUSE');
        setMenuCol(0); // focus on RESUME
      }

      // Matrix cursor movements
      const cols = difficultyRef.current === 'hard' ? 6 : 4;
      const rows = difficultyRef.current === 'easy' ? 2 : 4;
      let r = Math.floor(gridCursorRef.current / cols);
      let c = gridCursorRef.current % cols;

      if (code === 'ArrowLeft' || code === 'KeyA') {
        playSound('move', mutedRef.current);
        c = (c === 0) ? cols - 1 : c - 1;
      } else if (code === 'ArrowRight' || code === 'KeyD') {
        playSound('move', mutedRef.current);
        c = (c === cols - 1) ? 0 : c + 1;
      } else if (code === 'ArrowUp' || code === 'KeyW') {
        playSound('move', mutedRef.current);
        r = (r === 0) ? rows - 1 : r - 1;
      } else if (code === 'ArrowDown' || code === 'KeyS') {
        playSound('move', mutedRef.current);
        r = (r === rows - 1) ? 0 : r + 1;
      } else if (code === 'Space' || code === 'Enter') {
        handleCardFlip(r * cols + c);
      }

      setGridCursor(r * cols + c);
    }
  };

  // Keyboard hooks
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

  // Card coordinate lookups
  const getCardCoords = (idx) => {
    const diff = difficultyRef.current;
    const cols = diff === 'hard' ? 6 : 4;
    const rows = diff === 'easy' ? 2 : 4;

    const col = idx % cols;
    const row = Math.floor(idx / cols);

    let w = 80, h = 95, gap = 15, offY = 125;
    if (diff === 'easy') {
      w = 90; h = 120; gap = 20; offY = 185;
    } else if (diff === 'hard') {
      w = 68; h = 84; gap = 10; offY = 145;
    }

    const totalWidth = cols * w + (cols - 1) * gap;
    const offX = (CANVAS_SIZE - totalWidth) / 2;

    return {
      x: offX + col * (w + gap) + w / 2,
      y: offY + row * (h + gap) + h / 2,
      width: w,
      height: h
    };
  };

  // Canvas clicks
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Speaker toggle click check
    if (clickX >= 540 && clickX <= 590 && clickY >= 10 && clickY <= 50) {
      playSound('click', !muted);
      setMuted(prev => !prev);
      return;
    }

    const curState = gameState;
    if (curState === 'LOBBY') {
      // Row 0 (Difficulty)
      if (clickY >= 165 && clickY <= 195) {
        if (clickX >= 240 && clickX <= 330) {
          playSound('click', muted);
          setDifficulty('easy');
          difficultyRef.current = 'easy';
          setMenuRow(0); setMenuCol(0);
        } else if (clickX >= 350 && clickX <= 440) {
          playSound('click', muted);
          setDifficulty('medium');
          difficultyRef.current = 'medium';
          setMenuRow(0); setMenuCol(1);
        } else if (clickX >= 460 && clickX <= 550) {
          playSound('click', muted);
          setDifficulty('hard');
          difficultyRef.current = 'hard';
          setMenuRow(0); setMenuCol(2);
        }
      }
      // Row 1 (Deck Type)
      else if (clickY >= 235 && clickY <= 265) {
        if (clickX >= 240 && clickX <= 350) {
          playSound('click', muted);
          setDeckType('neon');
          deckTypeRef.current = 'neon';
          setMenuRow(1); setMenuCol(0);
        } else if (clickX >= 370 && clickX <= 480) {
          playSound('click', muted);
          setDeckType('emoji');
          deckTypeRef.current = 'emoji';
          setMenuRow(1); setMenuCol(1);
        }
      }
      // Row 2 (Time Trial)
      else if (clickY >= 305 && clickY <= 335) {
        if (clickX >= 240 && clickX <= 320) {
          playSound('click', muted);
          setTimeTrial(false);
          timeTrialRef.current = false;
          setMenuRow(2); setMenuCol(0);
        } else if (clickX >= 370 && clickX <= 450) {
          playSound('click', muted);
          setTimeTrial(true);
          timeTrialRef.current = true;
          setMenuRow(2); setMenuCol(1);
        }
      }
      // Row 3 (Sound synth)
      else if (clickY >= 375 && clickY <= 405) {
        if (clickX >= 240 && clickX <= 320) {
          playSound('click', !muted);
          setMuted(true);
          setMenuRow(3); setMenuCol(0);
        } else if (clickX >= 370 && clickX <= 450) {
          playSound('click', false);
          setMuted(false);
          setMenuRow(3); setMenuCol(1);
        }
      }
      // Row 4 (Launch simulation button)
      else if (clickX >= 150 && clickX <= 450 && clickY >= 460 && clickY <= 500) {
        playSound('click', muted);
        startGame();
      }
    } else if (curState === 'PAUSE') {
      if (clickX >= 200 && clickX <= 400 && clickY >= 240 && clickY <= 280) {
        playSound('click', muted);
        lastFrameTimeRef.current = performance.now();
        isTimerRunningRef.current = true;
        setGameState('GAMEPLAY');
      } else if (clickX >= 200 && clickX <= 400 && clickY >= 300 && clickY <= 340) {
        playSound('click', muted);
        startGame();
      } else if (clickX >= 200 && clickX <= 400 && clickY >= 360 && clickY <= 400) {
        playSound('click', muted);
        setGameState('LOBBY');
        setMenuRow(0); setMenuCol(0);
      }
    } else if (curState === 'GAMEOVER') {
      if (clickX >= 150 && clickX <= 450 && clickY >= 440 && clickY <= 480) {
        playSound('click', muted);
        startGame();
      } else if (clickX >= 150 && clickX <= 450 && clickY >= 495 && clickY <= 535) {
        playSound('click', muted);
        setGameState('LOBBY');
        setMenuRow(0); setMenuCol(0);
      }
    } else if (curState === 'GAMEPLAY') {
      const limit = difficultyRef.current === 'hard' ? 24 : difficultyRef.current === 'easy' ? 8 : 16;
      for (let i = 0; i < limit; i++) {
        const bounds = getCardCoords(i);
        if (
          clickX >= bounds.x - bounds.width / 2 &&
          clickX <= bounds.x + bounds.width / 2 &&
          clickY >= bounds.y - bounds.height / 2 &&
          clickY <= bounds.y + bounds.height / 2
        ) {
          handleCardFlip(i);
          break;
        }
      }
    }
  };

  // Mouse hover tracks keyboard matrix selection
  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || gameStateRef.current !== 'GAMEPLAY') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const limit = difficultyRef.current === 'hard' ? 24 : difficultyRef.current === 'easy' ? 8 : 16;
    for (let i = 0; i < limit; i++) {
      const bounds = getCardCoords(i);
      if (
        mouseX >= bounds.x - bounds.width / 2 &&
        mouseX <= bounds.x + bounds.width / 2 &&
        mouseY >= bounds.y - bounds.height / 2 &&
        mouseY <= bounds.y + bounds.height / 2
      ) {
        if (gridCursorRef.current !== i) {
          playSound('move', mutedRef.current);
          setGridCursor(i);
        }
        break;
      }
    }
  };

  // Main canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = (time) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      const dt = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;

      // Handle card flip physics inside state arrays
      const currentCards = cardsRef.current;
      if (gameStateRef.current === 'GAMEPLAY' || gameStateRef.current === 'PAUSE' || gameStateRef.current === 'GAMEOVER') {
        currentCards.forEach((card, idx) => {
          const isFlipped = card.isMatched || flippedIndicesRef.current.includes(idx);
          if (isFlipped) {
            card.flipProgress = Math.min(1, card.flipProgress + dt * 0.005);
          } else {
            card.flipProgress = Math.max(0, card.flipProgress - dt * 0.005);
          }
        });
      }

      // Handle Timer subtraction
      if (gameStateRef.current === 'GAMEPLAY' && isTimerRunningRef.current) {
        if (timeTrialRef.current) {
          timeLeftRef.current = Math.max(0, timeLeftRef.current - dt);

          const secondsLeft = Math.ceil(timeLeftRef.current / 1000);
          if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== lastTickSecondRef.current) {
            lastTickSecondRef.current = secondsLeft;
            playSound('tick', mutedRef.current);
          }

          if (timeLeftRef.current <= 0) {
            isTimerRunningRef.current = false;
            playSound('gameover', mutedRef.current);
            setGameResult('lose');
            setGameState('GAMEOVER');
            setMenuCol(0);
          }
        } else {
          timerElapsedRef.current += dt;
        }
      }

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.shadowBlur = 0;

      // Space grid background line fills
      ctx.strokeStyle = '#0a0812';
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
      // STATE: LOBBY (Matrix Setup selections)
      // ----------------------------------------------------
      if (curState === 'LOBBY') {
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 36px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEMORY MATCH SYSTEM', CANVAS_SIZE / 2, 80);

        ctx.shadowColor = '#00d4ff';
        ctx.fillStyle = '#8888a0';
        ctx.font = '13px "Exo 2", sans-serif';
        ctx.fillText('NEON MATRIX CALIBRATION', CANVAS_SIZE / 2, 115);

        // Options details
        ctx.shadowBlur = 0;
        ctx.font = 'bold 12px "Orbitron", monospace';
        ctx.textAlign = 'left';

        // 1. Difficulty Row
        ctx.fillStyle = menuRow === 0 ? '#ffffff' : '#6b7280';
        ctx.fillText('GRID MATRIX:', 80, 180);
        drawOptionButton(ctx, 'EASY', 240, 162, 90, 26, difficultyRef.current === 'easy', menuRow === 0 && menuCol === 0);
        drawOptionButton(ctx, 'MEDIUM', 350, 162, 90, 26, difficultyRef.current === 'medium', menuRow === 0 && menuCol === 1);
        drawOptionButton(ctx, 'HARD', 460, 162, 90, 26, difficultyRef.current === 'hard', menuRow === 0 && menuCol === 2);

        // 2. Deck Type Row
        ctx.fillStyle = menuRow === 1 ? '#ffffff' : '#6b7280';
        ctx.fillText('SYMBOL DECK:', 80, 250);
        drawOptionButton(ctx, 'NEON ICONS', 240, 232, 110, 26, deckTypeRef.current === 'neon', menuRow === 1 && menuCol === 0);
        drawOptionButton(ctx, 'SPACE EMOJIS', 370, 232, 110, 26, deckTypeRef.current === 'emoji', menuRow === 1 && menuCol === 1);

        // 3. Time Trial Row
        ctx.fillStyle = menuRow === 2 ? '#ffffff' : '#6b7280';
        ctx.fillText('TIME TRIAL:', 80, 320);
        drawOptionButton(ctx, 'DISABLED', 240, 302, 110, 26, !timeTrialRef.current, menuRow === 2 && menuCol === 0);
        drawOptionButton(ctx, 'ENABLED', 370, 302, 110, 26, timeTrialRef.current, menuRow === 2 && menuCol === 1);

        // 4. Mute Row
        ctx.fillStyle = menuRow === 3 ? '#ffffff' : '#6b7280';
        ctx.fillText('SOUND SYNTH:', 80, 390);
        drawOptionButton(ctx, 'MUTED', 240, 372, 110, 26, mutedRef.current, menuRow === 3 && menuCol === 0);
        drawOptionButton(ctx, 'ENABLED', 370, 372, 110, 26, !mutedRef.current, menuRow === 3 && menuCol === 1);

        // Arrow Pointer indicators
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 16px "Orbitron", monospace';
        if (menuRow < 4) {
          ctx.fillText('>', 55, 182 + menuRow * 70);
        }

        // 5. Launch Button
        const isLaunchSelected = menuRow === 4;
        ctx.lineWidth = 2;
        if (isLaunchSelected) {
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ffffff';
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(150, 460, 300, 45);
          ctx.strokeRect(150, 460, 300, 45);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 18px "Orbitron", monospace';
        } else {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.strokeRect(150, 460, 300, 45);

          ctx.fillStyle = '#a855f7';
          ctx.font = 'bold 16px "Orbitron", monospace';
        }
        ctx.textAlign = 'center';
        ctx.fillText('LAUNCH SIMULATION', CANVAS_SIZE / 2, 488);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#6b7280';
        ctx.font = '12px "Exo 2", sans-serif';
        ctx.fillText('USE WASD / ARROWS TO CONFIGURE • SPACEBAR TO SELECT', CANVAS_SIZE / 2, 555);
      }

      // ----------------------------------------------------
      // STATE: PAUSE
      // ----------------------------------------------------
      else if (curState === 'PAUSE') {
        drawGameplayHUD(ctx);
        drawGridCards(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.85)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#a855f7';
        ctx.font = 'bold 36px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SIMULATION PAUSED', CANVAS_SIZE / 2, 160);

        const pauseItems = ['RESUME', 'RESTART', 'BACK TO MENU'];
        pauseItems.forEach((text, idx) => {
          const isSelected = menuCol === idx;
          const y = 266 + idx * 60;

          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.strokeRect(CANVAS_SIZE / 2 - 110, y - 26, 220, 36);

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
        drawGameplayHUD(ctx);
        drawGridCards(ctx);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(5, 5, 10, 0.88)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const isWin = gameResultRef.current === 'win';
        ctx.shadowColor = isWin ? '#00ff88' : '#ff0055';
        ctx.shadowBlur = 15;
        ctx.fillStyle = isWin ? '#00ff88' : '#ff0055';
        ctx.font = 'bold 32px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isWin ? 'SIMULATION COMPLETE!' : 'SIMULATION ABORTED!', CANVAS_SIZE / 2, 110);

        // Hacker console logs
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(80, 160, 440, 230);
        ctx.strokeStyle = isWin ? 'rgba(0,255,136,0.2)' : 'rgba(255,0,85,0.2)';
        ctx.strokeRect(80, 160, 440, 230);

        ctx.font = '13px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = isWin ? '#00ff88' : '#ff0055';
        ctx.fillText(`> Memory stack trace terminal.`, 100, 190);
        ctx.fillText(`> Total moves executed: ${movesRef.current}`, 100, 210);

        if (isWin) {
          if (submitStatus === 'submitting') {
            ctx.fillStyle = '#00d4ff';
            ctx.fillText(`> Accessing core database node...`, 100, 240);
            ctx.fillText(`> Writing highscore registry blocks...`, 100, 260);
          } else if (submitStatus === 'submitted' && rewards) {
            ctx.fillStyle = '#00ff88';
            ctx.fillText(`> REGISTRY BLOCK UPLOAD VERIFIED.`, 100, 240);
            ctx.fillStyle = '#ffd700';
            ctx.fillText(`> CREDENTIAL CREDITS ACQUIRED:`, 100, 270);
            ctx.fillText(`  🪙 +${rewards.coinsEarned} Arcade Coins`, 100, 290);
            ctx.fillText(`  ⚡ +${rewards.expGained} Experience Nodes`, 100, 310);
            if (rewards.leveledUp) {
              ctx.fillStyle = '#a855f7';
              ctx.fillText(`  [ALERT] NEON LEVEL ADVANCED: Level ${rewards.level}`, 100, 335);
            }
          } else if (submitStatus === 'failed') {
            ctx.fillStyle = '#ff0055';
            ctx.fillText(`> [CRITICAL_ERROR] DATABASE NODE REFUSED SYNC`, 100, 240);
          } else if (submitStatus === 'offline') {
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(`> [NOTICE] OFFLINE OPERATION DETECTED`, 100, 240);
            ctx.fillText(`> Log in to authorize arcade reward tokens.`, 100, 265);
          }
        } else {
          ctx.fillStyle = '#ff0055';
          ctx.fillText(`> [CRITICAL] SIMULATION CLOCK TIMER TIMEOUT`, 100, 240);
          ctx.fillText(`> CPU core memory buffer overflow.`, 100, 260);
          ctx.fillText(`> Reflex calibration recommended.`, 100, 280);
        }

        // Action Options
        const gameOverItems = [isWin ? 'PLAY AGAIN' : 'RE-LAUNCH', 'QUIT TO MENU'];
        gameOverItems.forEach((text, idx) => {
          const isSelected = menuCol === idx;
          const y = 460 + idx * 55;

          ctx.textAlign = 'center';
          if (isSelected) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#a855f7';
            ctx.strokeStyle = '#a855f7';
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
        drawGameplayHUD(ctx);
        drawGridCards(ctx);
      }

      // Draw Global Speaker symbol
      drawSpeakerIcon(ctx);

      requestRef.current = requestAnimationFrame(render);
    };

    // Helper: Draw settings button outline & glowing fills
    const drawOptionButton = (c, text, x, y, w, h, isActive, isFocused) => {
      c.save();
      c.lineWidth = 1.5;
      if (isActive) {
        c.fillStyle = 'rgba(168, 85, 247, 0.15)';
        c.fillRect(x, y, w, h);
        c.strokeStyle = '#a855f7';
        c.strokeRect(x, y, w, h);
      } else {
        c.strokeStyle = 'rgba(255,255,255,0.08)';
        c.strokeRect(x, y, w, h);
      }

      if (isFocused) {
        c.strokeStyle = '#00d4ff';
        c.shadowColor = '#00d4ff';
        c.shadowBlur = 6;
        c.strokeRect(x - 2, y - 2, w + 4, h + 4);
      }

      c.shadowBlur = 0;
      c.textAlign = 'center';
      c.font = isActive ? 'bold 11px "Orbitron", monospace' : '10px "Orbitron", monospace';
      c.fillStyle = isActive ? '#ffffff' : '#6b7280';
      c.fillText(text, x + w / 2, y + h / 2 + 4);
      c.restore();
    };

    // Helper: Draw gameplay top header panel items
    const drawGameplayHUD = (c) => {
      c.textAlign = 'left';
      c.fillStyle = '#8888a0';
      c.font = '11px "Orbitron", monospace';
      c.fillText(timeTrialRef.current ? 'REMAINING TIME' : 'TIME ELAPSED', 50, 30);
      c.fillText('MOVES', 220, 30);
      c.fillText('MATCHES', 330, 30);
      c.fillText('BEST', 460, 30);

      c.fillStyle = '#ffffff';
      c.font = 'bold 15px "Orbitron", monospace';

      // Format time elapsed/left
      let displayedSecs = 0;
      if (timeTrialRef.current) {
        displayedSecs = Math.ceil(timeLeftRef.current / 1000);
      } else {
        displayedSecs = Math.floor(timerElapsedRef.current / 1000);
      }
      const mins = Math.floor(displayedSecs / 60);
      const remainingSecs = displayedSecs % 60;
      const formatted = `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;

      if (timeTrialRef.current && displayedSecs <= 10) {
        c.fillStyle = '#ff0055';
        c.shadowColor = '#ff0055';
        c.shadowBlur = 10;
      }
      c.fillText(formatted, 50, 50);
      c.shadowBlur = 0;
      c.fillStyle = '#ffffff';

      c.fillText(String(movesRef.current), 220, 50);

      // Matches count
      const totalPairs = difficultyRef.current === 'easy' ? 4 : difficultyRef.current === 'medium' ? 8 : 12;
      c.fillText(`${matchesRef.current} / ${totalPairs}`, 330, 50);

      c.fillStyle = '#ffd700';
      c.fillText(String(bestMoves), 460, 50);

      // Draw neon grid boundary outline divider
      c.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(40, 68);
      c.lineTo(560, 68);
      c.stroke();
    };

    // Helper: Draw cards grid inside 3D scale flip boundaries
    const drawGridCards = (c) => {
      const list = cardsRef.current;
      if (!list || list.length === 0) return;

      list.forEach((card, idx) => {
        const bounds = getCardCoords(idx);
        const progress = card.flipProgress;
        const scaleX = Math.abs(2 * progress - 1);

        c.save();
        // Translate to card center and apply 3D scale transition
        c.translate(bounds.x, bounds.y);
        c.scale(scaleX, 1);

        // Outer shape rounded boundary
        c.lineWidth = 2;
        if (progress > 0.5) {
          // FACE UP STATE
          c.fillStyle = '#100f1c';
          c.strokeStyle = card.isMatched ? '#00ff88' : 'rgba(255,255,255,0.12)';
          if (card.isMatched) {
            c.shadowColor = '#00ff88';
            c.shadowBlur = 8;
          }
          c.beginPath();
          c.roundRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height, 6);
          c.fill();
          c.stroke();
          c.shadowBlur = 0;

          // Render symbol details
          const color = card.isMatched ? '#00ff88' : '#a855f7';
          if (deckTypeRef.current === 'neon') {
            const drawFunc = drawSymbolMap[card.icon];
            const symSize = difficultyRef.current === 'hard' ? 26 : 32;
            if (drawFunc) {
              c.save();
              c.shadowColor = color;
              c.shadowBlur = card.isMatched ? 15 : 6;
              drawFunc(c, 0, 0, symSize, color);
              c.restore();
            }
          } else {
            // Emoji text fills
            c.fillStyle = '#ffffff';
            c.textAlign = 'center';
            c.font = difficultyRef.current === 'hard' ? '24px sans-serif' : '30px sans-serif';
            c.fillText(card.icon, 0, 8);
          }
        } else {
          // FACE DOWN STATE
          c.fillStyle = '#06050c';
          c.strokeStyle = 'rgba(168,85,247,0.3)';
          c.beginPath();
          c.roundRect(-bounds.width / 2, -bounds.height / 2, bounds.width, bounds.height, 6);
          c.fill();
          c.stroke();

          // Retro inner circuit stripe details
          c.strokeStyle = 'rgba(168,85,247,0.15)';
          c.lineWidth = 1;
          c.strokeRect(-bounds.width / 3, -bounds.height / 3, (bounds.width * 2) / 3, (bounds.height * 2) / 3);

          // Center glowing question mark
          c.fillStyle = 'rgba(168,85,247,0.4)';
          c.font = 'bold 22px "Orbitron", monospace';
          c.textAlign = 'center';
          c.fillText('?', 0, 7);
        }

        c.restore();

        // Keyboard grid selector border outline (always drawn unscaled)
        if (gameStateRef.current === 'GAMEPLAY' && gridCursorRef.current === idx && !card.isMatched) {
          c.save();
          c.strokeStyle = '#00d4ff';
          c.lineWidth = 2.5;
          c.shadowColor = '#00d4ff';
          c.shadowBlur = 8;
          c.beginPath();
          c.roundRect(
            bounds.x - bounds.width / 2 - 3,
            bounds.y - bounds.height / 2 - 3,
            bounds.width + 6,
            bounds.height + 6,
            8
          );
          c.stroke();
          c.restore();
        }
      });
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
  }, [gameState, menuRow, menuCol, gridCursor, cards, flippedIndices, moves, matches, muted, gameResult, submitStatus, rewards]);

  return (
    <div className="memory-page-wrapper">
      {/* Centered Logo-Aligned Floating Circular Back Button */}
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
            setMenuCol(0); // Reset selection
          }}
          className="floating-back-btn"
          title="Pause Game"
          style={{ cursor: 'pointer', outline: 'none' }}
        >
          <Pause size={20} />
        </button>
      ) : null}

      <div className="game-content-card">
        <div className="cabinet-screen crt-screen" onClick={handleCanvasClick} onMouseMove={handleCanvasMouseMove}>
          {/* CRT scanlines, reflection and flicker overlay */}
          <div className="crt-scanlines"></div>
          <div className="crt-reflection"></div>
          <div className="crt-flicker"></div>

          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', background: '#020105', width: '100%', height: 'auto', maxWidth: '600px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;
