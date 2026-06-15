import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  Star, 
  Users, 
  Clock,
  Download,
  Play,
  Heart,
  Eye,
  Gamepad2,
  Trophy,
  Flame,
  Zap
} from 'lucide-react';
import Foote from './Foote';
import '../styles/UODGaming.css';

const UODGaming = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [likedGames, setLikedGames] = useState(new Set());
  const [installPrompt, setInstallPrompt] = useState(window.deferredPrompt || null);

  useEffect(() => {
    const handleInstallPromptAvailable = () => {
      setInstallPrompt(window.deferredPrompt);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };
    window.addEventListener('pwa-install-available', handleInstallPromptAvailable);
    window.addEventListener('pwa-installed', handleAppInstalled);
    return () => {
      window.removeEventListener('pwa-install-available', handleInstallPromptAvailable);
      window.removeEventListener('pwa-installed', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      alert('UOD Gaming is already installed or PWA installation is not supported by your browser.');
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const categories = [
    { id: 'all', label: 'All Games', icon: Gamepad2 },
    { id: 'action', label: 'Action', icon: Zap },
    { id: 'adventure', label: 'Adventure', icon: Search },
    { id: 'puzzle', label: 'Puzzle', icon: Grid },
    { id: 'strategy', label: 'Strategy', icon: Trophy },
    { id: 'casual', label: 'Casual', icon: Heart },
  ];

  const games = [
    {
      id: 1,
      title: "Snake Arcade",
      category: "action",
      rating: 4.9,
      players: "1.2M",
      image: "/snake_icon.png",
      description: "Classic neon arcade Snake with dynamic difficulty speed scaling, audio synths, and particles!",
      downloads: "5.2M",
      lastUpdated: "Just now",
      featured: true,
      path: "/Snake",
      tags: ["Retro", "Arcade", "Singleplayer"]
    },
    {
      id: 2,
      title: "Tic Tac Toe Duo",
      category: "strategy",
      rating: 4.8,
      players: "890K",
      image: "/ttt_icon.png",
      description: "Play Tic Tac Toe locally with custom names, round tracking, turn indicators, and neon animations!",
      downloads: "2.1M",
      lastUpdated: "1 day ago",
      featured: true,
      path: "/TTT",
      tags: ["Board", "Multiplayer", "Local"]
    },
    {
      id: 3,
      title: "Color Guesser RGB",
      category: "puzzle",
      rating: 4.7,
      players: "650K",
      image: "/color_icon.png",
      description: "Test your quickness and luck by matching hex/RGB color codes to correct preview swatches!",
      downloads: "1.1M",
      lastUpdated: "3 days ago",
      featured: false,
      path: "/ColorG",
      tags: ["Logic", "Casual", "Trivia"]
    },
    {
      id: 4,
      title: "Memory Card Match",
      category: "puzzle",
      rating: 4.8,
      players: "1.1M",
      image: "/memory_icon.png",
      description: "Flip and match custom neon icons under active move counters, scoring multipliers, and visual feedback!",
      downloads: "2.5M",
      lastUpdated: "Just now",
      featured: false,
      path: "/MemoryCard",
      tags: ["Logic", "Memory", "Singleplayer"]
    },
    {
      id: 5,
      title: "Rock Paper Scissors Duo",
      category: "casual",
      rating: 4.7,
      players: "980K",
      image: "/rps_icon.png",
      description: "Tactile Rock-Paper-Scissors combat against an automated AI. Track victory wins and streak scores!",
      downloads: "1.8M",
      lastUpdated: "1 day ago",
      featured: false,
      path: "/RPS",
      tags: ["Versus", "CPU", "Casual"]
    },
    {
      id: 6,
      title: "Cyber Block Stacker",
      category: "puzzle",
      rating: 4.8,
      players: "2.5M",
      image: "/tetris_icon.png",
      description: "Classic tetromino falling-block puzzle. Move, rotate, slide, and hard drop blocks to clear rows!",
      downloads: "6.2M",
      lastUpdated: "Just now",
      featured: false,
      path: "/Tetris",
      tags: ["Retro", "Puzzle", "Singleplayer"]
    },
    {
      id: 7,
      title: "Neon Brick Breaker",
      category: "action",
      rating: 4.9,
      players: "1.4M",
      image: "/brick_preview.png",
      description: "Classic physics breakout brick bouncer. Control the safety paddle to break lines of glowing neon glass bricks!",
      downloads: "3.5M",
      lastUpdated: "Just now",
      featured: false,
      path: "/Breakout",
      tags: ["Arcade", "Physics", "Singleplayer"]
    },
    {
      id: 8,
      title: "Cyber Falcon",
      category: "action",
      rating: 4.7,
      players: "1.8M",
      image: "/falcon_preview.png",
      description: "Thrust-based gravity avoider. Guide the ship through gaps between scrolling laser pillar obstacles!",
      downloads: "4.2M",
      lastUpdated: "Just now",
      featured: false,
      path: "/Falcon",
      tags: ["Endless", "Survival", "Singleplayer"]
    }
  ];

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'players':
        return parseFloat(b.players) - parseFloat(a.players);
      case 'downloads':
        return parseFloat(b.downloads) - parseFloat(a.downloads);
      case 'newest':
        return new Date(b.lastUpdated) - new Date(a.lastUpdated);
      default:
        return b.featured ? 1 : -1;
    }
  });

  const toggleLike = (gameId) => {
    const newLikedGames = new Set(likedGames);
    if (newLikedGames.has(gameId)) {
      newLikedGames.delete(gameId);
    } else {
      newLikedGames.add(gameId);
    }
    setLikedGames(newLikedGames);
  };

  const GameCard = ({ game, index }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.1 }}
      className={`game-card ${viewMode} ${game.featured ? 'featured' : ''} ${game.isComingSoon ? 'coming-soon-card' : ''}`}
      whileHover={game.isComingSoon ? {} : { y: -5, transition: { duration: 0.2 } }}
    >
      <div className="game-image-container">
        <div 
          className="game-image" 
          style={game.image.startsWith('linear') ? { background: game.image } : { backgroundImage: `url(${game.image})` }}
        >
          {!game.isComingSoon && (
            <div className="game-overlay">
              <motion.button
                className="play-btn"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(game.path)}
              >
                <Play size={24} />
              </motion.button>
            </div>
          )}
          {game.featured && (
            <div className="featured-badge">
              <Flame size={16} />
              Featured
            </div>
          )}
          {game.isComingSoon && (
            <div className="coming-soon-badge" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255, 0, 110, 0.85)', padding: '4px 10px', borderRadius: 4, fontFamily: 'var(--font-primary)', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#fff' }}>
              Coming Soon
            </div>
          )}
          <button
            className={`like-btn ${likedGames.has(game.id) ? 'liked' : ''}`}
            onClick={() => toggleLike(game.id)}
          >
            <Heart size={20} fill={likedGames.has(game.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      
      <div className="game-content">
        <div className="game-header">
          <h3 className="game-title">{game.title}</h3>
          <div className="game-rating">
            <Star size={16} fill="currentColor" />
            {game.rating}
          </div>
        </div>
        
        <p className="game-description">{game.description}</p>
        
        <div className="game-tags">
          {game.tags.map(tag => (
            <span key={tag} className="game-tag">{tag}</span>
          ))}
        </div>
        
        <div className="game-stats">
          <div className="stat">
            <Users size={16} />
            {game.players}
          </div>
          <div className="stat">
            <Download size={16} />
            {game.downloads}
          </div>
          <div className="stat">
            <Clock size={16} />
            {game.lastUpdated}
          </div>
        </div>
        
        <div className="game-actions">
          <motion.button
            className={`btn btn-primary play-game-btn ${game.isComingSoon ? 'disabled' : ''}`}
            whileHover={game.isComingSoon ? {} : { scale: 1.02 }}
            whileTap={game.isComingSoon ? {} : { scale: 0.98 }}
            onClick={() => {
              if (game.path) {
                navigate(game.path);
              }
            }}
            disabled={game.isComingSoon}
          >
            <Play size={18} />
            {game.isComingSoon ? 'Coming Soon' : 'Play Now'}
          </motion.button>
          
          <motion.button
            className="btn btn-ghost download-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleInstallClick}
            title="Download/Install App Locally"
          >
            <Download size={18} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );


  return (
    <div className="uod-gaming-wrapper">
      {/* Hero Section */}
      <section className="games-hero">
        <div className="hero-bg-animation">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="bg-particle"
              animate={{
                y: [0, -50, 0],
                x: [0, Math.random() * 30 - 15, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        
        <div className="container">
          <motion.div
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="hero-title text-gaming">
              <Gamepad2 className="title-icon" />
              Epic Gaming Universe
            </h1>
            <p className="hero-subtitle">
              Discover thousands of games, from indie masterpieces to AAA blockbusters
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="games-filters">
        <div className="container">
          <div className="filters-container">
            <div className="search-section">
              <div className="search-input-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search games..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="filter-section">
              <div className="category-filters">
                {categories.map(category => {
                  const Icon = category.icon;
                  return (
                    <motion.button
                      key={category.id}
                      className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(category.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon size={18} />
                      {category.label}
                    </motion.button>
                  );
                })}
              </div>

              <div className="view-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="players">Most Players</option>
                  <option value="downloads">Most Downloaded</option>
                  <option value="newest">Recently Updated</option>
                </select>

                <div className="view-toggle">
                  <button
                    className={viewMode === 'grid' ? 'active' : ''}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    className={viewMode === 'list' ? 'active' : ''}
                    onClick={() => setViewMode('list')}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="games-section">
        <div className="container">
          <div className="games-header">
            <h2 className="section-title">
              {selectedCategory === 'all' ? 'All Games' : 
               categories.find(c => c.id === selectedCategory)?.label} 
              <span className="games-count">({sortedGames.length})</span>
            </h2>
          </div>

          <AnimatePresence>
            <div className={`games-grid ${viewMode}`}>
              {sortedGames.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} />
              ))}
            </div>
          </AnimatePresence>

          {sortedGames.length === 0 && (
            <motion.div
              className="no-games"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Gamepad2 size={64} />
              <h3>No games found</h3>
              <p>Try adjusting your search or filter criteria</p>
            </motion.div>
          )}
        </div>
      </section>

      <Foote />
    </div>
  );
};

export default UODGaming;