import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ArrowRight, Play } from 'lucide-react';
import '../Css/Info.css';

const Info = () => {
  const gamesInfo = [
    {
      id: 'ttt',
      title: 'Tic Tac Toe',
      tagline: 'All Time Favourite Duo-Clasher',
      description: 'Experience the timeless fun of Tic Tac Toe, a game that never gets old. Relive the nostalgia of childhood and engage in school-notebook battles. This classic is the ultimate test of simple strategy and quick thinking for two players.',
      image: 'https://play-lh.googleusercontent.com/zPxLgj5nvl20ahJV7aFC6S5mD8kii5CEEDj25j1P9CYAfXL9sdDuO-8eES0r4DhJHrU',
      path: '/TTT',
      badges: ['2 Players', 'Local Versus', 'Strategy'],
      accentColor: 'var(--primary-neon)'
    },
    {
      id: 'snake',
      title: 'Snake Arcade',
      tagline: 'The Ultimate Retro Challenge',
      description: 'A beloved classic web-based challenge where players guide a snake to eat food and grow longer. Navigating the grid requires agility and strategy to avoid crashing into walls or your own tail. Eat, grow, and break your highscore!',
      image: 'https://www.codewithc.com/wp-content/uploads/2014/04/snake-game3.png',
      path: '/Snake',
      badges: ['Single Player', 'Reflexes', 'Retro Classic'],
      accentColor: 'var(--secondary-neon)'
    },
    {
      id: 'color',
      title: 'Color Guesser',
      tagline: 'Test Your Color Reflexes',
      description: 'An interactive web game where players guess RGB color values based on presented color swatches. Earn points, build your streak, and progress through increasingly challenging color spectrum levels. Perfect for casual gamers and enthusiasts alike!',
      image: 'https://play-lh.googleusercontent.com/BE-Z-fyEJKI5Y69ETauqFK_jgNmVB1dn6cvrb-aOk_f6EdE3QVgInezDZym9FjKJJzlx',
      path: '/ColorG',
      badges: ['Single Player', 'Casual', 'Trivia'],
      accentColor: 'var(--accent-purple)'
    }
  ];

  return (
    <div className="info-container">
      {/* Section Header */}
      <div className="info-header">
        <h2 className="info-section-title">
          <Gamepad2 className="info-title-icon" />
          Game Info & Guide
        </h2>
        <p className="info-section-subtitle">
          Explore descriptions, controls, and launch guides for each retro game in our arcade.
        </p>
      </div>

      {/* Game Info Cards list */}
      <div className="info-content-wrapper">
        {gamesInfo.map((game, index) => {
          const isEven = index % 2 === 0;
          return (
            <div 
              key={game.id} 
              className={`info-card ${isEven ? 'row-normal' : 'row-reversed'}`}
              style={{ '--accent-glow': game.accentColor }}
            >
              {/* Media Part */}
              <div className="info-media">
                <img src={game.image} alt={game.title} className="info-game-img" />
                <div className="image-tint-glow" style={{ backgroundColor: game.accentColor }}></div>
              </div>

              {/* Text Part */}
              <div className="info-text">
                <div className="info-badge-list">
                  {game.badges.map((badge, idx) => (
                    <span key={idx} className="info-game-badge" style={{ borderColor: game.accentColor, color: game.accentColor }}>
                      {badge}
                    </span>
                  ))}
                </div>
                <h3 className="info-game-title" style={{ color: game.accentColor }}>
                  {game.title}
                </h3>
                <h4 className="info-game-tagline">{game.tagline}</h4>
                <p className="info-game-description">{game.description}</p>
                <div className="info-game-actions">
                  <Link to={game.path} className="info-play-btn" style={{ '--btn-bg': game.accentColor }}>
                    <Play size={16} fill="currentColor" />
                    <span>Launch Game</span>
                    <ArrowRight size={16} className="arrow-icon" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Info;