import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom'; // Import Routes, Route, and useLocation
import Navbar from "./Components/Navbar"
import Home from '../src/Components/Home';
import Login from '../src/Components/Login';
import Foote from '../src/Components/Foote';
import Sign from '../src/Components/Sign';
import UODGaming from './Components/UODGaming'
import Download from './Components/Download'
import Snake from './Components/Snake'
import ColorG from './Components/ColorG'
import TTT from './Components/TTT'
import MemoryCard from './Components/MemoryCard'
import RockPaperScissors from './Components/RockPaperScissors'
import Tetris from './Components/Tetris'
import BrickBreaker from './Components/BrickBreaker'
import CyberFalcon from './Components/CyberFalcon'

// Import global styles
import './styles/globals.css';

// Scroll to top helper component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <div>
      <ScrollToTop />
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign" element={<Sign />} />
        <Route path="/Foote" element={<Foote />} />
        <Route path="/UODGaming" element={<UODGaming />} />
        <Route path="/Download" element={<Download />} />
        <Route path="/Snake" element={<Snake />} />  
        <Route path="/ColorG" element={<ColorG />} />  
        <Route path="/TTT" element={<TTT />} />  
        <Route path="/MemoryCard" element={<MemoryCard />} />  
        <Route path="/RPS" element={<RockPaperScissors />} />  
        <Route path="/Tetris" element={<Tetris />} />  
        <Route path="/Breakout" element={<BrickBreaker />} />  
        <Route path="/Falcon" element={<CyberFalcon />} />  
      </Routes>            

      
    </div>
  )
}

export default App

