import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  ShoppingBag,
  Zap, 
  Activity,
  Award,
  MousePointer
} from 'lucide-react';
import '../Css/Clicker.css';
import Foote from './Foote';

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'buy') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'reset') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.3);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    console.warn("Web Audio API failed:", e);
  }
};

const Clicker = () => {
  // Load saved progress
  const loadSaved = (key, fallback) => {
    const val = localStorage.getItem(key);
    return val ? parseFloat(val) : fallback;
  };

  const [minerals, setMinerals] = useState(() => loadSaved('clicker_minerals', 0));
  const [mpc, setMpc] = useState(() => loadSaved('clicker_mpc', 1)); // Minerals per Click
  const [mps, setMps] = useState(() => loadSaved('clicker_mps', 0)); // Minerals per Second
  const [allTimeScore, setAllTimeScore] = useState(() => loadSaved('clicker_alltime', 0));

  // Upgrades Count State
  const [upgrades, setUpgrades] = useState({
    autoMiner: () => loadSaved('clicker_up_autominer', 0),
    quantumDrill: () => loadSaved('clicker_up_quantumdrill', 0),
    processingPlant: () => loadSaved('clicker_up_procplant', 0),
    matterSynth: () => loadSaved('clicker_up_mattersynth', 0),
  });

  // Dynamic upgrade costs
  const costs = {
    autoMiner: Math.floor(15 * Math.pow(1.15, upgrades.autoMiner())),
    quantumDrill: Math.floor(100 * Math.pow(1.2, upgrades.quantumDrill())),
    processingPlant: Math.floor(500 * Math.pow(1.15, upgrades.processingPlant())),
    matterSynth: Math.floor(2500 * Math.pow(1.25, upgrades.matterSynth())),
  };

  const [floatingTexts, setFloatingTexts] = useState([]);

  // Save progress changes
  useEffect(() => {
    localStorage.setItem('clicker_minerals', minerals.toString());
    localStorage.setItem('clicker_mpc', mpc.toString());
    localStorage.setItem('clicker_mps', mps.toString());
    localStorage.setItem('clicker_alltime', allTimeScore.toString());
    localStorage.setItem('clicker_up_autominer', upgrades.autoMiner.toString());
    localStorage.setItem('clicker_up_quantumdrill', upgrades.quantumDrill.toString());
    localStorage.setItem('clicker_up_procplant', upgrades.processingPlant.toString());
    localStorage.setItem('clicker_up_mattersynth', upgrades.matterSynth.toString());
  }, [minerals, mpc, mps, allTimeScore, upgrades]);

  // Main game tick: updates every 100ms for visual smoothness
  useEffect(() => {
    const interval = setInterval(() => {
      if (mps > 0) {
        setMinerals(prev => {
          const added = mps / 10;
          setAllTimeScore(all => all + added);
          return prev + added;
        });
      }
    }, 100);
    return () => clearInterval(interval);
  }, [mps]);

  const handleAsteroidClick = (e) => {
    playSound('click');
    setMinerals(prev => prev + mpc);
    setAllTimeScore(prev => prev + mpc);

    // Spawn floating number
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();

    setFloatingTexts(prev => [...prev, { id, text: `+${mpc}`, x, y }]);

    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 800);
  };

  const buyUpgrade = (type) => {
    const cost = costs[type];
    if (minerals < cost) return;

    playSound('buy');
    setMinerals(prev => prev - cost);
    setUpgrades(prev => ({ ...prev, [type]: prev[type] + 1 }));

    // Apply upgrade benefits
    if (type === 'autoMiner') {
      setMps(prev => prev + 0.5);
    } else if (type === 'quantumDrill') {
      setMpc(prev => prev + 1);
    } else if (type === 'processingPlant') {
      setMps(prev => prev + 4);
    } else if (type === 'matterSynth') {
      setMps(prev => prev + 25);
      setMpc(prev => prev + 5);
    }
  };

  const resetGame = () => {
    if (confirm('Are you sure you want to restore your mining progress? This will reset your upgrades, minerals, and multipliers.')) {
      playSound('reset');
      setMinerals(0);
      setMpc(1);
      setMps(0);
      setAllTimeScore(0);
      setUpgrades({
        autoMiner: 0,
        quantumDrill: 0,
        processingPlant: 0,
        matterSynth: 0
      });
    }
  };

  return (
    <div className="clicker-page-wrapper">
      <div className="game-nav-bar">
        <Link to="/UODGaming" className="back-btn">
          <ArrowLeft size={16} />
          <span>Back to Games</span>
        </Link>
        <span className="game-status-title">Arcade Room: Space Clicker</span>
      </div>

      <div className="game-content-card clicker-grid">
        {/* Left Side: Clicker Panel */}
        <div className="clicker-main-panel">
          <div className="game-header">
            <h1 className="game-title">Space Clicker</h1>
            <p className="game-subtitle">Mine the core. Tap the neon singularity to collect minerals.</p>
          </div>

          <div className="score-display">
            <span className="minerals-count">{Math.floor(minerals).toLocaleString()}</span>
            <span className="minerals-label">Minerals Gathered</span>
          </div>

          {/* Interactive Singularity */}
          <div className="asteroid-container">
            <motion.div
              className="asteroid-body"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleAsteroidClick}
            >
              <div className="asteroid-glow"></div>
              <div className="asteroid-texture"></div>

              {/* Floating Numbers */}
              <AnimatePresence>
                {floatingTexts.map(t => (
                  <motion.span
                    key={t.id}
                    className="floating-text"
                    style={{ left: t.x, top: t.y }}
                    initial={{ opacity: 1, y: 0, scale: 0.8 }}
                    animate={{ opacity: 0, y: -80, scale: 1.2 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  >
                    {t.text}
                  </motion.span>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Rate dashboard */}
          <div className="stats-dashboard m-0">
            <div className="stat-card">
              <MousePointer className="stat-icon neon-blue" size={18} />
              <div className="stat-info">
                <span className="stat-label">Click Power (MPC)</span>
                <span className="stat-value">+{mpc} / click</span>
              </div>
            </div>

            <div className="stat-card">
              <Activity className="stat-icon neon-pink" size={18} />
              <div className="stat-info">
                <span className="stat-label">Automation (MPS)</span>
                <span className="stat-value">+{mps.toFixed(1)} / sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Upgrades Shop */}
        <div className="upgrades-shop-panel">
          <div className="shop-header">
            <ShoppingBag className="shop-icon" />
            <h2>Upgrades & Tech Shop</h2>
          </div>

          <div className="shop-list">
            {/* Auto Miner */}
            <div className={`shop-card ${minerals < costs.autoMiner ? 'disabled' : ''}`} onClick={() => buyUpgrade('autoMiner')}>
              <div className="upgrade-details">
                <h3 className="upgrade-title">Auto-Drone</h3>
                <p className="upgrade-desc">Automatically mines. Adds **+0.5 MPS**.</p>
                <div className="upgrade-owned">Owned: {upgrades.autoMiner}</div>
              </div>
              <button className="btn btn-upgrade-cost" disabled={minerals < costs.autoMiner}>
                {costs.autoMiner} M
              </button>
            </div>

            {/* Quantum Drill */}
            <div className={`shop-card ${minerals < costs.quantumDrill ? 'disabled' : ''}`} onClick={() => buyUpgrade('quantumDrill')}>
              <div className="upgrade-details">
                <h3 className="upgrade-title">Quantum Drill</h3>
                <p className="upgrade-desc">Increases manual clicks. Adds **+1 MPC**.</p>
                <div className="upgrade-owned">Owned: {upgrades.quantumDrill}</div>
              </div>
              <button className="btn btn-upgrade-cost" disabled={minerals < costs.quantumDrill}>
                {costs.quantumDrill} M
              </button>
            </div>

            {/* Processing Plant */}
            <div className={`shop-card ${minerals < costs.processingPlant ? 'disabled' : ''}`} onClick={() => buyUpgrade('processingPlant')}>
              <div className="upgrade-details">
                <h3 className="upgrade-title">Refining Plant</h3>
                <p className="upgrade-desc">Refines raw core ores. Adds **+4.0 MPS**.</p>
                <div className="upgrade-owned">Owned: {upgrades.processingPlant}</div>
              </div>
              <button className="btn btn-upgrade-cost" disabled={minerals < costs.processingPlant}>
                {costs.processingPlant} M
              </button>
            </div>

            {/* Matter Synth */}
            <div className={`shop-card ${minerals < costs.matterSynth ? 'disabled' : ''}`} onClick={() => buyUpgrade('matterSynth')}>
              <div className="upgrade-details">
                <h3 className="upgrade-title">Singularity Synthesizer</h3>
                <p className="upgrade-desc">Harness core power. Adds **+25 MPS & +5 MPC**.</p>
                <div className="upgrade-owned">Owned: {upgrades.matterSynth}</div>
              </div>
              <button className="btn btn-upgrade-cost" disabled={minerals < costs.matterSynth}>
                {costs.matterSynth} M
              </button>
            </div>
          </div>

          <div className="shop-footer">
            <div className="alltime-stats">
              <Award size={16} />
              <span>All-time Mined: {Math.floor(allTimeScore).toLocaleString()} M</span>
            </div>
            
            <button className="btn btn-reset-shop" onClick={resetGame}>
              <RotateCcw size={16} />
              <span>Reset Tech</span>
            </button>
          </div>
        </div>
      </div>

      <Foote />
    </div>
  );
};

export default Clicker;
