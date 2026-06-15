import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Clock, 
  Zap, 
  Flame, 
  Star, 
  Gamepad2, 
  Heart, 
  Eye, 
  Music,
  Anchor,
  Crown,
  Moon,
  Bomb,
  HelpCircle,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import '../Css/MemoryCard.css';
import Foote from './Foote';

const ICON_MAP = {
  Zap,
  Flame,
  Trophy,
  Star,
  Gamepad2,
  Heart,
  Eye,
  Music,
  Anchor,
  Crown,
  Moon,
  Bomb
};

const playSound = (type, enabled = true) => {
  if (!enabled) return;
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
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'flip') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'match') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.35);
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
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.6);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (e) {
    console.warn("Web Audio API not supported:", e);
  }
};

const NEON_DECK = ['Zap', 'Flame', 'Trophy', 'Star', 'Gamepad2', 'Heart', 'Eye', 'Music', 'Anchor', 'Crown', 'Moon', 'Bomb'];
const EMOJI_DECK = ['👾', '🚀', '💎', '🍕', '👑', '👽', '🦄', '🎸', '🦖', '🎈', '⚽', '🍔'];

const MemoryCard = () => {
  // Config state
  const [difficulty, setDifficulty] = useState('medium'); // easy, medium, hard
  const [deckType, setDeckType] = useState('neon'); // neon, emoji
  const [timeTrial, setTimeTrial] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  // Play state
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0); // counts up or down
  const [isWon, setIsWon] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const [bestMoves, setBestMoves] = useState('-');
  const timerRef = useRef(null);

  // Fetch best record based on current configurations
  useEffect(() => {
    const key = `memory_best_${difficulty}_${deckType}_${timeTrial ? 'trial' : 'normal'}`;
    const saved = localStorage.getItem(key);
    setBestMoves(saved ? parseInt(saved) : '-');
  }, [difficulty, deckType, timeTrial, gameStarted]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Tick Hook
  useEffect(() => {
    if (gameStarted && !isWon && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (timeTrial) {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              setIsGameOver(true);
              playSound('gameover', soundEnabled);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, isWon, isGameOver, timeTrial]);

  const startGame = () => {
    playSound('click', soundEnabled);

    // Set cards count
    let pairsCount = 8; // medium
    if (difficulty === 'easy') pairsCount = 4;
    else if (difficulty === 'hard') pairsCount = 12;

    const baseDeck = deckType === 'neon' ? NEON_DECK : EMOJI_DECK;
    const selectedPairs = baseDeck.slice(0, pairsCount);
    const duplicateDeck = [...selectedPairs, ...selectedPairs];
    
    // Shuffle
    const shuffled = duplicateDeck
      .map((icon, idx) => ({ id: idx, icon, isMatched: false }))
      .sort(() => Math.random() - 0.5);

    // Set timer initial value
    if (timeTrial) {
      let limit = 60; // medium
      if (difficulty === 'easy') limit = 30;
      else if (difficulty === 'hard') limit = 45;
      setTimer(limit);
    } else {
      setTimer(0);
    }

    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setIsWon(false);
    setIsGameOver(false);
    setGameStarted(true);
  };

  const handleCardClick = (index) => {
    if (isWon || isGameOver || cards[index].isMatched || flippedIndices.includes(index) || flippedIndices.length >= 2) {
      return;
    }

    playSound('flip', soundEnabled);
    const nextFlipped = [...flippedIndices, index];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIdx, secondIdx] = nextFlipped;

      if (cards[firstIdx].icon === cards[secondIdx].icon) {
        // Match found
        setTimeout(() => {
          setCards(prev => {
            const updated = [...prev];
            updated[firstIdx].isMatched = true;
            updated[secondIdx].isMatched = true;
            return updated;
          });
          setMatches(prev => {
            const nextMatches = prev + 1;
            playSound('match', soundEnabled);
            
            const totalPairs = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : 12;
            if (nextMatches === totalPairs) {
              setIsWon(true);
              playSound('win', soundEnabled);
              
              // Record score
              const key = `memory_best_${difficulty}_${deckType}_${timeTrial ? 'trial' : 'normal'}`;
              const currentBest = localStorage.getItem(key);
              const finalMoves = moves + 1;
              if (!currentBest || finalMoves < parseInt(currentBest)) {
                localStorage.setItem(key, finalMoves.toString());
                setBestMoves(finalMoves);
              }
            }
            return nextMatches;
          });
          setFlippedIndices([]);
        }, 500);
      } else {
        // Mismatch
        setTimeout(() => {
          playSound('mismatch', soundEnabled);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  const exitToConfig = () => {
    playSound('click', soundEnabled);
    if (timerRef.current) clearInterval(timerRef.current);
    setGameStarted(false);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="memory-page-wrapper">
      <div className="game-nav-bar">
        {gameStarted ? (
          <button onClick={exitToConfig} className="back-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={16} />
            <span>Config Screen</span>
          </button>
        ) : (
          <Link to="/UODGaming" className="back-btn">
            <ArrowLeft size={16} />
            <span>Back to Games</span>
          </Link>
        )}
        <span className="game-status-title">Arcade Room: Memory Match</span>
      </div>

      <div className="game-content-card">
        {/* CONFIG SCREEN */}
        {!gameStarted && (
          <div className="config-screen-overlay">
            <div className="game-header">
              <h1 className="game-title">Memory Match System</h1>
              <p className="game-subtitle">Configure your matrix & launch the simulation.</p>
            </div>

            <div className="arcade-settings-box">
              {/* Difficulty Selection */}
              <div className="setting-row">
                <span className="setting-label">Grid Difficulty</span>
                <div className="options-grid">
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setDifficulty('easy'); }}
                    className={`opt-btn btn-easy ${difficulty === 'easy' ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>Easy (4x2)</span>
                  </button>
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setDifficulty('medium'); }}
                    className={`opt-btn btn-medium ${difficulty === 'medium' ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>Medium (4x4)</span>
                  </button>
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setDifficulty('hard'); }}
                    className={`opt-btn btn-hard ${difficulty === 'hard' ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>Hard (6x4)</span>
                  </button>
                </div>
              </div>

              {/* Decks Select */}
              <div className="setting-row">
                <span className="setting-label">Symbol Deck</span>
                <div className="options-grid cols-2">
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setDeckType('neon'); }}
                    className={`opt-btn btn-medium ${deckType === 'neon' ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>Neon Icons</span>
                  </button>
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setDeckType('emoji'); }}
                    className={`opt-btn btn-medium ${deckType === 'emoji' ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>Space Emojis</span>
                  </button>
                </div>
              </div>

              {/* Mode & Sound Toggles */}
              <div className="setting-row cols-2-split">
                <div className="toggle-box">
                  <span className="setting-label">Time Trial</span>
                  <button 
                    onClick={() => { playSound('click', soundEnabled); setTimeTrial(!timeTrial); }}
                    className={`opt-btn btn-medium toggle-btn ${timeTrial ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>{timeTrial ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="toggle-box">
                  <span className="setting-label">Sound Synth</span>
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`opt-btn btn-medium toggle-btn ${soundEnabled ? 'active' : ''}`}
                  >
                    <div className="led-dot"></div>
                    <span>{soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <div className="launch-action-panel">
              <div className="alltime-stats-indicator text-center mb-4 text-xs font-mono tracking-widest text-slate-500 uppercase">
                Best Moves: <span className="text-white font-bold">{bestMoves}</span>
              </div>
              <motion.button 
                onClick={startGame}
                className="btn-start-arcade"
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(139, 92, 246, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Play size={20} fill="currentColor" />
                <span>Launch Simulation</span>
              </motion.button>
            </div>
          </div>
        )}

        {/* ACTIVE GAME PLAYBOARD */}
        {gameStarted && (
          <div className="active-gameboard">
            <div className="game-header">
              <h1 className="game-title small">Memory Card Match</h1>
              <p className="game-subtitle">Difficulty: <span className="uppercase font-bold" style={{ color: difficulty === 'easy' ? '#00ff88' : difficulty === 'medium' ? '#00d4ff' : '#ff007f' }}>{difficulty}</span> | Deck: <span className="uppercase font-bold text-white">{deckType}</span></p>
            </div>

            {/* Stats Dashboard */}
            <div className="stats-dashboard">
              <div className="stat-card">
                <Clock className="stat-icon neon-blue" size={20} />
                <div className="stat-info">
                  <span className="stat-label">{timeTrial ? 'Time Remaining' : 'Time Elapsed'}</span>
                  <span className="stat-value" style={timeTrial && timer <= 10 ? { color: '#ff007f', textShadow: '0 0 10px #ff007f' } : {}}>{formatTime(timer)}</span>
                </div>
              </div>

              <div className="stat-card">
                <Gamepad2 className="stat-icon neon-pink" size={20} />
                <div className="stat-info">
                  <span className="stat-label">Moves</span>
                  <span className="stat-value">{moves}</span>
                </div>
              </div>

              <div className="stat-card">
                <Trophy className="stat-icon neon-green" size={20} />
                <div className="stat-info">
                  <span className="stat-label">Best Record (Moves)</span>
                  <span className="stat-value">{bestMoves}</span>
                </div>
              </div>
            </div>

            {/* Board */}
            <div className={`memory-board grid-${difficulty}`}>
              {cards.map((card, idx) => {
                const isFlipped = flippedIndices.includes(idx) || card.isMatched;
                const IconComponent = ICON_MAP[card.icon];
                
                return (
                  <motion.div
                    key={card.id}
                    className={`memory-tile-container ${card.isMatched ? 'tile-matched' : ''}`}
                    onClick={() => handleCardClick(idx)}
                    whileHover={isFlipped ? {} : { scale: 1.05 }}
                    whileTap={isFlipped ? {} : { scale: 0.95 }}
                  >
                    <div className={`memory-tile-inner ${isFlipped ? 'flipped' : ''}`}>
                      {/* Front Side */}
                      <div className={`tile-front ${card.isMatched ? 'glow-matched' : ''}`}>
                        {deckType === 'neon' ? (
                          IconComponent && <IconComponent className="tile-icon" size={difficulty === 'hard' ? 24 : 32} />
                        ) : (
                          <span className="tile-emoji" style={difficulty === 'hard' ? { fontSize: '1.6rem' } : { fontSize: '2rem' }}>{card.icon}</span>
                        )}
                      </div>

                      {/* Back Side */}
                      <div className="tile-back">
                        <HelpCircle className="question-icon" size={difficulty === 'hard' ? 20 : 30} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="control-actions gap-4">
              <button className="btn btn-reset" onClick={startGame}>
                <RotateCcw size={18} />
                <span>Reset Grid</span>
              </button>
              <button className="btn btn-reset" onClick={exitToConfig}>
                <span>Change Config</span>
              </button>
            </div>

            {/* Win Overlay */}
            <AnimatePresence>
              {isWon && (
                <motion.div 
                  className="win-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div 
                    className="win-modal"
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <Trophy size={60} className="win-trophy animate-bounce" />
                    <h2>Simulation Complete!</h2>
                    <p>Excellent memory! You cleared the {difficulty} deck in <strong>{moves}</strong> moves.</p>
                    <div className="modal-buttons">
                      <button className="btn btn-primary" onClick={startGame}>
                        Play Again
                      </button>
                      <button className="btn btn-ghost" onClick={exitToConfig}>
                        Settings
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Game Over Overlay */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div 
                  className="win-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ background: 'rgba(20, 5, 10, 0.96)' }}
                >
                  <motion.div 
                    className="win-modal"
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: "spring", damping: 15 }}
                  >
                    <Bomb size={60} className="win-trophy animate-pulse" style={{ color: '#ff007f', filter: 'drop-shadow(0 0 15px currentColor)' }} />
                    <h2 style={{ color: '#ff007f', textShadow: '0 0 10px rgba(255, 0, 127, 0.4)' }}>Simulation Aborted!</h2>
                    <p>Time has run out! The CPU overloaded the system core memory. Train your reflexes and try again.</p>
                    <div className="modal-buttons">
                      <button className="btn btn-primary" style={{ background: '#ff007f', boxShadow: '0 0 15px rgba(255,0,127,0.4)' }} onClick={startGame}>
                        Re-Launch
                      </button>
                      <button className="btn btn-ghost" onClick={exitToConfig}>
                        Settings
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Foote />
    </div>
  );
};

export default MemoryCard;
