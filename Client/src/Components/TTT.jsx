import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Users, Play, Cpu } from 'lucide-react';
import axios from 'axios';
import "../Css/TTT.css";
import Foote from './Foote';

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
  
  // Scoreboard
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  // VS Computer Mode States
  const [gameMode, setGameMode] = useState('duo'); // 'duo' or 'cpu'
  const [isCpuThinking, setIsCpuThinking] = useState(false);

  const startGame = (e) => {
    e.preventDefault();
    const p1Input = document.getElementById('player-name').value.trim();
    const p2Input = document.getElementById('player-name2').value.trim();
    if (p1Input === '' || (gameMode === 'duo' && p2Input === '')) {
      alert('Please enter the required player names to start.');
      return;
    }
    setPlayer1Name(p1Input);
    setPlayer2Name(gameMode === 'cpu' ? 'Cyber CPU' : p2Input);
    setGameActive(true);
    setHasStarted(true);
    resetBoard();
    setGameResult('');
  };

  const resetBoard = () => {
    setBoard(Array(9).fill(''));
    setCurrentPlayer('X');
    setGameResult('');
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
    setIsCpuThinking(false);
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
      const token = localStorage.getItem('token');
      if (gameId && token) {
        axios.post(`/api/v1/games/${gameId}/score`, { score: 100 }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => console.log('Win result saved:', res.data))
        .catch(err => console.error('Failed to save result:', err));
      } else {
        console.warn('DB record skipped: Missing gameId or authentication token.');
      }

    } else if (checkDraw(newBoard)) {
      setGameResult("It's a draw!");
      setGameActive(false);
      
      // Update scores
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));

      // Record draw to database
      const token = localStorage.getItem('token');
      if (gameId && token) {
        axios.post(`/api/v1/games/${gameId}/score`, { score: 50 }, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => console.log('Draw result saved:', res.data))
        .catch(err => console.error('Failed to save result:', err));
      } else {
        console.warn('DB record skipped: Missing gameId or authentication token.');
      }
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

  return (
    <div className="ttt-container">
      {/* Sleek Navigation Bar */}
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: TTT</span>
      </div>

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
            <button type="submit" className="start-game-btn">
              <Play size={18} fill="currentColor" />
               Start Battle
            </button>
          </form>
        ) : (
          /* Active Gameplay View */
          <div className="active-game-view">
            {/* Scoreboard */}
            <div className="ttt-scoreboard">
              <div className={`score-card p1-card ${currentPlayer === 'X' && gameActive ? 'active-turn' : ''}`}>
                <span className="score-label">{player1Name} (X)</span>
                <span className="score-value">{scores.X}</span>
              </div>
              <div className="score-card draws-card">
                <span className="score-label">Draws</span>
                <span className="score-value">{scores.draws}</span>
              </div>
              <div className={`score-card p2-card ${currentPlayer === 'O' && gameActive ? 'active-turn' : ''}`}>
                <span className="score-label">{player2Name} (O)</span>
                <span className="score-value">{scores.O}</span>
              </div>
            </div>

            {/* Turn Announcement Banner */}
            {gameActive && (
              <div className="turn-banner">
                {isCpuThinking ? (
                  <span className="cpu-thinking-text">CPU is calculating...</span>
                ) : (
                  <>
                    Current Turn:{' '}
                    <span className={currentPlayer === 'X' ? 'p1-text' : 'p2-text'}>
                      {currentPlayer === 'X' ? player1Name : player2Name} ({currentPlayer})
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Game Result Banner */}
            {gameResult && (
              <div className={`result-banner ${gameResult.includes('wins') ? 'winner-glow' : 'draw-glow'}`}>
                <Trophy size={20} className="trophy-icon" />
                <span>{gameResult}</span>
              </div>
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
      <Foote />
    </div>
  );
};

export default TTT;