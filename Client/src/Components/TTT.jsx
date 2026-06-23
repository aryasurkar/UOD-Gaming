import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Users, Play, Cpu } from 'lucide-react';
import axios from 'axios';
import "../Css/TTT.css";

const TTT = () => {
  const location = useLocation();
  const [gameId, setGameId] = useState(null);
  
  useEffect(() => {
    if (location.state?.gameId) {
      setGameId(location.state.gameId);
    } else {
      // Fallback: fetch game ID by title
      axios.get('/api/v1/games')
        .then(res => {
          const game = res.data.games?.find(g => g.title === "Tic Tac Toe Duo");
          if (game) setGameId(game._id);
        })
        .catch(err => console.error("Failed to load game info:", err));
    }
  }, [location.state]);

  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [gameActive, setGameActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('X'); // 'X' or 'O'
  const [gameResult, setGameResult] = useState('');
  const [board, setBoard] = useState(Array(9).fill(''));
  const [rewards, setRewards] = useState(null);
  const [submitStatus, setSubmitStatus] = useState(''); // 'submitting', 'submitted', 'failed', 'offline'
  
  // Scoreboard
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  // VS Computer Mode States
  const [gameMode, setGameMode] = useState('duo'); // 'duo' or 'cpu'
  const [isCpuThinking, setIsCpuThinking] = useState(false);

  const startGame = (e) => {
    e.preventDefault();
    let p1Input = '';
    let p2Input = '';
    
    if (gameMode === 'cpu') {
      const storedUser = localStorage.getItem('user');
      let defaultPlayerName = 'Player';
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          if (userObj.username) defaultPlayerName = userObj.username;
        } catch (err) {}
      }
      p1Input = defaultPlayerName;
      p2Input = 'Cyber CPU';
    } else {
      const p1El = document.getElementById('player-name');
      const p2El = document.getElementById('player-name2');
      p1Input = p1El ? p1El.value.trim() : '';
      p2Input = p2El ? p2El.value.trim() : '';
      if (p1Input === '' || p2Input === '') {
        alert('Please enter the required player names to start.');
        return;
      }
    }

    setPlayer1Name(p1Input);
    setPlayer2Name(p2Input);
    setGameActive(true);
    setHasStarted(true);
    resetBoard();
    setGameResult('');
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameResult('');
    setRewards(null);
    setSubmitStatus('');
    setGameActive(true);
  };

  const startNewGame = () => {
    setHasStarted(false);
    setGameActive(false);
    setPlayer1Name('');
    setPlayer2Name('');
    setScores({ X: 0, O: 0, draws: 0 });
    setBoard(Array(9).fill(''));
    setGameResult('');
    setRewards(null);
    setSubmitStatus('');
    setIsCpuThinking(false);
  };

  const submitTttResult = (scoreToSubmit) => {
    const token = localStorage.getItem('token');
    if (gameId && token) {
      setSubmitStatus('submitting');
      setRewards(null);
      axios.post(`/api/v1/games/${gameId}/score`, { score: scoreToSubmit }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        console.log('Result saved:', res.data);
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
            console.error('Failed to update local storage user info:', e);
          }
        }
      })
      .catch(err => {
        console.error('Failed to save result:', err);
        setSubmitStatus('failed');
      });
    } else {
      console.warn('DB record skipped: Missing gameId or authentication token.');
      setSubmitStatus('offline');
    }
  };

  const handleClick = (cellIndex) => {
    if (!gameActive || isCpuThinking) return;
    if (gameMode === 'cpu' && currentPlayer !== 'X') return;
    if (board[cellIndex] !== '') return;
    
    const newBoard = [...board];
    newBoard[cellIndex] = currentPlayer;
    setBoard(newBoard);
    
    if (checkWin(newBoard, currentPlayer)) {
      const winnerName = currentPlayer === 'X' ? player1Name : player2Name;
      setGameResult(`${winnerName} wins!`);
      setGameActive(false);
      
      // Update scores
      setScores(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] + 1 }));

      // Record result to database
      submitTttResult(100);

    } else if (checkDraw(newBoard)) {
      setGameResult("It's a draw!");
      setGameActive(false);
      
      // Update scores
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));

      // Record draw to database
      submitTttResult(50);
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  // CPU Smart AI Logic
  const getBestMove = (currentBoard) => {
    const winCombos = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    const findCombosOfTwo = (player) => {
      for (let combo of winCombos) {
        const values = combo.map(i => currentBoard[i]);
        const playerCount = values.filter(v => v === player).length;
        const emptyCount = values.filter(v => v === '').length;
        if (playerCount === 2 && emptyCount === 1) {
          return combo[values.indexOf('')];
        }
      }
      return null;
    };

    // 1. Can CPU win?
    const cpuWinMove = findCombosOfTwo('O');
    if (cpuWinMove !== null) return cpuWinMove;

    // 2. Block Player?
    const playerWinMove = findCombosOfTwo('X');
    if (playerWinMove !== null) return playerWinMove;

    // 3. Take Center?
    if (currentBoard[4] === '') return 4;

    // 4. Take Corners?
    const corners = [0, 2, 6, 8];
    const openCorners = corners.filter(i => currentBoard[i] === '');
    if (openCorners.length > 0) {
      return openCorners[Math.floor(Math.random() * openCorners.length)];
    }

    // 5. Take Sides?
    const sides = [1, 3, 5, 7];
    const openSides = sides.filter(i => currentBoard[i] === '');
    if (openSides.length > 0) {
      return openSides[Math.floor(Math.random() * openSides.length)];
    }
    return null;
  };

  // CPU Turn Handler
  useEffect(() => {
    if (gameActive && gameMode === 'cpu' && currentPlayer === 'O' && !gameResult) {
      setIsCpuThinking(true);
      const timer = setTimeout(() => {
        const cpuMove = getBestMove(board);
        if (cpuMove !== null) {
          const newBoard = [...board];
          newBoard[cpuMove] = 'O';
          setBoard(newBoard);
          
          if (checkWin(newBoard, 'O')) {
            setGameResult(`${player2Name} wins!`);
            setGameActive(false);
            setScores(prev => ({ ...prev, O: prev.O + 1 }));
          } else if (checkDraw(newBoard)) {
            setGameResult("It's a draw!");
            setGameActive(false);
            setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
          } else {
            setCurrentPlayer('X');
          }
        }
        setIsCpuThinking(false);
      }, 750); // Simulated thinking time

      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameActive, gameMode, board, gameResult, player2Name]);

  const checkWin = (currentBoard, player) => {
    const winningCombinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6] // Diagonals
    ];
    return winningCombinations.some(combination => {
      return combination.every(index => {
        return currentBoard[index] === player;
      });
    });
  };

  const checkDraw = (currentBoard) => {
    return currentBoard.every(cell => cell !== '');
  };

  const isGameplayActive = hasStarted && gameActive;

  return (
    <div className="ttt-container">
      {/* Floating minimal back button overlay */}
      {!isGameplayActive && (
        <Link to="/UODGaming" className="floating-back-btn" title="Back to Games">
          <ArrowLeft size={20} />
        </Link>
      )}

      <div className="game-content-card">
        <div className="game-header">
          <h1 className="game-title">Tic Tac Toe</h1>
          <p className="game-subtitle">Neon duo combat. Connect three marks to win.</p>
        </div>

        {!hasStarted ? (
          /* Players Setup Form */
          <form className="players-setup-form" onSubmit={startGame}>
            {/* Game Mode Selector */}
            <div className="mode-selector-tabs">
              <button 
                type="button" 
                className={`mode-tab-btn ${gameMode === 'duo' ? 'active' : ''}`}
                onClick={() => setGameMode('duo')}
              >
                <Users size={14} />
                <span>Duo Combat</span>
              </button>
              <button 
                type="button" 
                className={`mode-tab-btn ${gameMode === 'cpu' ? 'active' : ''}`}
                onClick={() => setGameMode('cpu')}
              >
                <Cpu size={14} />
                <span>VS Computer</span>
              </button>
            </div>

            <div className="setup-icon-wrapper">
              {gameMode === 'cpu' ? (
                <Cpu size={40} className="setup-icon" />
              ) : (
                <Users size={40} className="setup-icon" />
              )}
            </div>
            <h3 className="setup-title">
              {gameMode === 'cpu' ? 'Prepare Player vs CPU' : 'Register Players'}
            </h3>
            {gameMode !== 'cpu' && (
              <div className="setup-input-group">
                <div className="input-field-wrapper">
                  <span className="player-indicator p1-color">X</span>
                  <input 
                    type="text" 
                    id="player-name" 
                    placeholder="Player Name" 
                    defaultValue={player1Name}
                    required 
                  />
                </div>
                <div className="input-field-wrapper">
                  <span className="player-indicator p2-color">O</span>
                  <input 
                    type="text" 
                    id="player-name2" 
                    placeholder="Opponent Name" 
                    value={gameMode === 'cpu' ? 'Cyber CPU' : player2Name}
                    onChange={(e) => gameMode !== 'cpu' && setPlayer2Name(e.target.value)}
                    disabled={gameMode === 'cpu'}
                    required 
                  />
                </div>
              </div>
            )}
            <button type="submit" className="start-game-btn">
              <Play size={18} fill="currentColor" />
               Start Battle
            </button>
          </form>
        ) : (
          /* Active Gameplay View */
          <div className="active-game-view">
            {/* Arcade Cabinet Frame */}
            <div className="cabinet-screen crt-screen">
              {/* CRT scanlines, reflection and flicker overlay */}
              <div className="crt-scanlines"></div>
              <div className="crt-reflection"></div>
              <div className="crt-flicker"></div>

              {/* Floating HUD Overlays */}
              <div className="game-hud-container">
                <div className={`game-hud-item ${currentPlayer === 'X' && gameActive ? 'active-turn-hud' : ''}`}>
                  <span className="game-hud-label">{player1Name} (X)</span>
                  <span className="game-hud-value" style={{ color: 'var(--primary-neon)' }}>{scores.X}</span>
                </div>

                <div className="game-hud-item">
                  <span className="game-hud-label">Draws</span>
                  <span className="game-hud-value" style={{ color: 'var(--text-muted)' }}>{scores.draws}</span>
                </div>

                <div className={`game-hud-item ${currentPlayer === 'O' && gameActive ? 'active-turn-hud' : ''}`}>
                  <span className="game-hud-label">{player2Name} (O)</span>
                  <span className="game-hud-value" style={{ color: 'var(--secondary-neon)' }}>{scores.O}</span>
                </div>
              </div>

              <div className="game-play-area">
                {/* Turn Announcement Banner */}
                {gameActive && (
                  <div className="turn-banner">
                    {isCpuThinking ? (
                      <span className="cpu-thinking-text">CPU is calculating...</span>
                    ) : (
                      <>
                        Turn:{' '}
                        <span className={currentPlayer === 'X' ? 'p1-text' : 'p2-text'}>
                          {currentPlayer === 'X' ? player1Name : player2Name} ({currentPlayer})
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Game Result Banner */}
                {gameResult && (
                  <>
                    <div className={`result-banner ${gameResult.includes('wins') ? 'winner-glow' : 'draw-glow'}`}>
                      <Trophy size={20} className="trophy-icon" />
                      <span>{gameResult}</span>
                    </div>
                    
                    {submitStatus === 'submitting' && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0' }}>Saving result online...</p>
                    )}
                    {submitStatus === 'submitted' && rewards && (
                      <div className="game-over-rewards" style={{ margin: '10px auto', padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center', maxWidth: '250px' }}>
                        <div style={{ color: '#ffd700', marginBottom: '4px' }}>🪙 +{rewards.coinsEarned} Coins</div>
                        <div style={{ color: 'var(--primary-neon)', marginBottom: '4px' }}>⚡ +{rewards.expGained} XP</div>
                        {rewards.leveledUp && (
                          <div style={{ color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0,255,136,0.5)', marginTop: '4px' }}>LEVEL UP! (Lv {rewards.level})</div>
                        )}
                      </div>
                    )}
                    {submitStatus === 'failed' && (
                      <p style={{ color: 'var(--secondary-neon)', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0' }}>Failed to save online.</p>
                    )}
                    {submitStatus === 'offline' && (
                      <p style={{ color: 'var(--accent-orange)', fontSize: '0.85rem', textAlign: 'center', margin: '8px 0' }}>Log in to save stats & earn coins!</p>
                    )}
                  </>
                )}

                {/* Tic Tac Toe Grid */}
                <div className="game-board">
                  {board.map((cell, index) => (
                    <button 
                      key={index} 
                      className={`cell ${cell ? 'cell-occupied' : 'cell-empty'}`} 
                      onClick={() => handleClick(index)}
                      disabled={!gameActive || cell !== '' || isCpuThinking}
                    >
                      <span className={cell === 'X' ? 'p1-text mark' : 'p2-text mark'}>
                        {cell}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Control Panel */}
            <div className="ttt-controls">
              <button onClick={resetBoard} className="btn-control reset-btn">
                <RotateCcw size={16} />
                Reset Round
              </button>
              <button onClick={startNewGame} className="btn-control lobby-btn">
                <Users size={16} />
                Change Players
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TTT;