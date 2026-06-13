import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Trophy, Users, Play } from 'lucide-react';
import "../Css/TTT.css";
import Foote from './Foote';

const TTT = () => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [gameActive, setGameActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState('X'); // 'X' or 'O'
  const [gameResult, setGameResult] = useState('');
  const [board, setBoard] = useState(Array(9).fill(''));
  
  // Scoreboard
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  useEffect(() => {
    // Send player name to the server to store in the database on game start
    if (gameActive && player1Name && player2Name) {
      fetch('../scripts/php/tictacktoe.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=insertPlayer&name=${encodeURIComponent(player1Name)}`,
      })
      .then(response => response.text())
      .then(data => console.log('P1 registered:', data))
      .catch(err => console.warn('P1 DB registration skipped:', err));
    }
  }, [gameActive, player1Name]);

  const startGame = (e) => {
    e.preventDefault();
    const p1Input = document.getElementById('player-name').value.trim();
    const p2Input = document.getElementById('player-name2').value.trim();
    if (p1Input === '' || p2Input === '') {
      alert('Please enter both player names to start the game.');
      return;
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
  };

  const handleClick = (cellIndex) => {
    if (!gameActive) return;
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
      fetch('../scripts/php/tictacktoe.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=recordGameResult&playerName=${encodeURIComponent(winnerName)}&result=Win`,
      })
      .then(response => response.text())
      .then(data => console.log('Result saved:', data))
      .catch(err => console.warn('DB record skipped:', err));

    } else if (checkDraw(newBoard)) {
      setGameResult("It's a draw!");
      setGameActive(false);
      
      // Update scores
      setScores(prev => ({ ...prev, draws: prev.draws + 1 }));

      // Record draw to database
      fetch('../scripts/php/tictacktoe.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `action=recordGameResult&playerName=${encodeURIComponent(player1Name)}&result=Draw`,
      })
      .then(response => response.text())
      .catch(err => console.warn('DB record skipped:', err));
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

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
            <div className="setup-icon-wrapper">
              <Users size={40} className="setup-icon" />
            </div>
            <h3 className="setup-title">Register Players</h3>
            <div className="setup-input-group">
              <div className="input-field-wrapper">
                <span className="player-indicator p1-color">X</span>
                <input 
                  type="text" 
                  id="player-name" 
                  placeholder="Player 1 Name" 
                  defaultValue={player1Name}
                  required 
                />
              </div>
              <div className="input-field-wrapper">
                <span className="player-indicator p2-color">O</span>
                <input 
                  type="text" 
                  id="player-name2" 
                  placeholder="Player 2 Name" 
                  defaultValue={player2Name}
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
                Current Turn:{' '}
                <span className={currentPlayer === 'X' ? 'p1-text' : 'p2-text'}>
                  {currentPlayer === 'X' ? player1Name : player2Name} ({currentPlayer})
                </span>
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
                  disabled={!gameActive || cell !== ''}
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