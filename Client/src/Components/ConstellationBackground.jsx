import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ConstellationBackground = () => {
  const canvasRef = useRef(null);
  const location = useLocation();

  // Watch for router path transitions to trigger the hyperspace warp speed burst
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('trigger-warp', { detail: { duration: 950 } }));
  }, [location.pathname]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // Configuration
    const PARTICLE_COUNT = 90;
    const CONNECTION_DIST = 110;
    const METEOR_COUNT = 4; // Subtle meteor count
    const NEON_COLORS = [
      'rgba(0, 212, 255, ',  // Cyan
      'rgba(255, 0, 110, ',  // Pink
      'rgba(139, 92, 246, ', // Purple
      'rgba(0, 255, 136, '   // Green
    ];

    // Warp speed values
    let warpProgress = 0;
    let targetWarpProgress = 0;
    let warpTimeout = null;

    // Listen to route transition events to warp stars
    const handleTriggerWarp = (e) => {
      const duration = e.detail?.duration || 1000;
      targetWarpProgress = 1;
      
      if (warpTimeout) clearTimeout(warpTimeout);
      warpTimeout = setTimeout(() => {
        targetWarpProgress = 0;
      }, duration - 400); // slow down before the warp effect ends
    };

    window.addEventListener('trigger-warp', handleTriggerWarp);

    // Resize canvas
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Particle Class representing stars
    class Particle {
      constructor(spawnNearCenter = false) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        if (spawnNearCenter) {
          // Spawn closer to center for warp loop resets
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 60 + 5;
          this.x = centerX + Math.cos(angle) * radius;
          this.y = centerY + Math.sin(angle) * radius;
        } else {
          this.x = Math.random() * canvas.width;
          this.y = Math.random() * canvas.height;
        }
        
        this.radius = Math.random() * 2 + 1; // 1px to 3px
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        
        const colorIdx = Math.floor(Math.random() * NEON_COLORS.length);
        this.colorPrefix = NEON_COLORS[colorIdx];
      }

      update() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (warpProgress < 0.01) {
          // --- NORMAL GENTLE FLOAT MODE ---
          this.vx *= 0.98;
          this.vy *= 0.98;

          const minSpeed = 0.15;
          const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
          if (currentSpeed < minSpeed) {
            const angle = Math.random() * Math.PI * 2;
            this.vx += Math.cos(angle) * 0.04;
            this.vy += Math.sin(angle) * 0.04;
          }

          this.x += this.vx;
          this.y += this.vy;

          // Wall boundary wrapping / bounce
          if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); }
          else if (this.x > canvas.width) { this.x = canvas.width; this.vx = -Math.abs(this.vx); }
          if (this.y < 0) { this.y = 0; this.vy = Math.abs(this.vy); }
          else if (this.y > canvas.height) { this.y = canvas.height; this.vy = -Math.abs(this.vy); }
        } else {
          // --- HYPERSPACE WARP SPEED MODE ---
          const dx = this.x - centerX;
          const dy = this.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Exponential speed scaling outwards
          const speed = (dist / 80 + 1.2) * warpProgress * 14;
          this.x += (dx / dist) * speed;
          this.y += (dy / dist) * speed;

          // Loop stars that fly off-screen back to the center
          if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 50 + 10;
            this.x = centerX + Math.cos(angle) * radius;
            this.y = centerY + Math.sin(angle) * radius;
            this.radius = Math.random() * 2 + 1;
            this.vx = 0;
            this.vy = 0;
          }
        }
      }

      draw() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (warpProgress < 0.05) {
          // Render glowing dot stars
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.shadowBlur = 8;
          ctx.shadowColor = this.colorPrefix + '0.7)';
          ctx.fillStyle = this.colorPrefix + '0.8)';
          ctx.fill();
        } else {
          // Render radial light trails representing speed stretching
          const dx = this.x - centerX;
          const dy = this.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const len = warpProgress * 38 * (dist / 180 + 0.15); // Longer lines outwards
          
          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(this.x - (dx / dist) * len, this.y - (dy / dist) * len);
          
          const grad = ctx.createLinearGradient(
            this.x, this.y,
            this.x - (dx / dist) * len, this.y - (dy / dist) * len
          );
          grad.addColorStop(0, this.colorPrefix + '0.95)');
          grad.addColorStop(1, this.colorPrefix + '0)');
          
          ctx.strokeStyle = grad;
          ctx.lineWidth = this.radius * (1.0 + warpProgress * 0.4);
          ctx.lineCap = 'round';
          ctx.shadowBlur = 5;
          ctx.shadowColor = this.colorPrefix + '0.4)';
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    // Meteor Class for shooting stars
    class Meteor {
      constructor() {
        this.reset();
        this.y = Math.random() * -canvas.height;
      }

      reset() {
        this.x = Math.random() * (canvas.width + 300) - 100;
        this.y = -50 - Math.random() * 100;
        this.length = Math.random() * 90 + 50;
        this.speed = Math.random() * 5 + 4;
        this.angle = (Math.PI / 4) * 3; // 135 deg
        this.opacity = Math.random() * 0.3 + 0.15;
        this.width = Math.random() * 1.4 + 0.8;
        this.colorPrefix = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      }

      update() {
        // Only run meteors when NOT in full warp speed (which would visually clash)
        if (warpProgress < 0.1) {
          this.x += Math.cos(this.angle) * this.speed;
          this.y += Math.sin(this.angle) * this.speed;

          if (this.y > canvas.height + 100 || this.x < -150) {
            this.reset();
          }
        }
      }

      draw() {
        if (warpProgress < 0.1) {
          const grad = ctx.createLinearGradient(
            this.x, this.y, 
            this.x - Math.cos(this.angle) * this.length, 
            this.y - Math.sin(this.angle) * this.length
          );
          grad.addColorStop(0, this.colorPrefix + this.opacity + ')');
          grad.addColorStop(1, this.colorPrefix + '0)');

          ctx.beginPath();
          ctx.moveTo(this.x, this.y);
          ctx.lineTo(
            this.x - Math.cos(this.angle) * this.length, 
            this.y - Math.sin(this.angle) * this.length
          );
          
          ctx.shadowBlur = 6;
          ctx.shadowColor = this.colorPrefix + '0.3)';
          ctx.strokeStyle = grad;
          ctx.lineWidth = this.width;
          ctx.lineCap = 'round';
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      }
    }

    // Initialize stars
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    // Initialize meteors
    let meteors = [];
    for (let i = 0; i < METEOR_COUNT; i++) {
      meteors.push(new Meteor());
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Interpolate warp transition progress towards target state
      warpProgress += (targetWarpProgress - warpProgress) * 0.07;

      // Update & draw background meteors
      for (let i = 0; i < meteors.length; i++) {
        meteors[i].update();
        meteors[i].draw();
      }

      ctx.shadowBlur = 0; // Reset shadow blur for line draws

      // Update & draw particles (stars)
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        // Skip constellation line links if warp transition is active
        if (warpProgress > 0.05) continue;

        // Draw connections between neighboring stars
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.18 * (1 - warpProgress);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            ctx.strokeStyle = p1.colorPrefix + alpha + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('trigger-warp', handleTriggerWarp);
      if (warpTimeout) clearTimeout(warpTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -3,
        pointerEvents: 'none',
        display: 'block'
      }}
    />
  );
};

export default ConstellationBackground;
