import React, { useEffect, useRef } from 'react';

const ConstellationBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    // Configuration
    const PARTICLE_COUNT = 85;
    const CONNECTION_DIST = 110;
    const MOUSE_DIST = 160;
    const METEOR_COUNT = 5; // Subtle meteor shower count
    const NEON_COLORS = [
      'rgba(0, 212, 255, ',  // Cyan
      'rgba(255, 0, 110, ',  // Pink
      'rgba(139, 92, 246, ', // Purple
      'rgba(0, 255, 136, '   // Green
    ];

    // Resize canvas
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Particle Class
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.radius = Math.random() * 2 + 1; // 1px to 3px
        // Slow speed for floating effect
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        
        // Assign a neon color index
        const colorIdx = Math.floor(Math.random() * NEON_COLORS.length);
        this.colorPrefix = NEON_COLORS[colorIdx];
      }

      update() {
        // Handle attraction to mouse cursor (subtle gravitational pull)
        const mouse = mouseRef.current;
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < MOUSE_DIST) {
            // Very gentle force towards the cursor
            const force = (MOUSE_DIST - dist) / MOUSE_DIST;
            this.vx += (dx / dist) * force * 0.03;
            this.vy += (dy / dist) * force * 0.03;
            
            // Limit speed so particles don't shoot away
            const speedLimit = 1.2;
            const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (currentSpeed > speedLimit) {
              this.vx = (this.vx / currentSpeed) * speedLimit;
              this.vy = (this.vy / currentSpeed) * speedLimit;
            }
          }
        }

        // Apply friction/drag to stabilize velocities
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Restore minimal float speed if too slow
        const minSpeed = 0.15;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed < minSpeed) {
          const angle = Math.random() * Math.PI * 2;
          this.vx += Math.cos(angle) * 0.05;
          this.vy += Math.sin(angle) * 0.05;
        }

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0) {
          this.x = 0;
          this.vx = Math.abs(this.vx);
        } else if (this.x > canvas.width) {
          this.x = canvas.width;
          this.vx = -Math.abs(this.vx);
        }

        if (this.y < 0) {
          this.y = 0;
          this.vy = Math.abs(this.vy);
        } else if (this.y > canvas.height) {
          this.y = canvas.height;
          this.vy = -Math.abs(this.vy);
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.colorPrefix + '0.8)';
        ctx.fillStyle = this.colorPrefix + '0.85)';
        
        ctx.fill();
      }
    }

    // Meteor Class for shooting stars effect
    class Meteor {
      constructor() {
        this.reset();
        // Stagger initial spawn y coordinates
        this.y = Math.random() * -canvas.height;
      }

      reset() {
        // Spawn off-screen to the top-right
        this.x = Math.random() * (canvas.width + 300) - 100;
        this.y = -50 - Math.random() * 100;
        this.length = Math.random() * 90 + 50; // meteor tail length
        this.speed = Math.random() * 6 + 5; // speed
        this.angle = (Math.PI / 4) * 3; // 135 degrees (moves down-left)
        this.opacity = Math.random() * 0.35 + 0.15; // faint glowing trail
        this.width = Math.random() * 1.5 + 0.8;
        
        // Pick one of the neon colors
        this.colorPrefix = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      }

      update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Reset if meteor moves past the screen edges
        if (this.y > canvas.height + 100 || this.x < -150) {
          this.reset();
        }
      }

      draw() {
        // Draw meteor with a linear fading gradient tail
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
        ctx.shadowColor = this.colorPrefix + '0.4)';
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }
    }

    // Initialize particles & meteors
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    let meteors = [];
    for (let i = 0; i < METEOR_COUNT; i++) {
      meteors.push(new Meteor());
    }

    // Animation loop
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw meteors (drawn in background layer)
      for (let i = 0; i < meteors.length; i++) {
        meteors[i].update();
        meteors[i].draw();
      }

      ctx.shadowBlur = 0; // Reset shadow blur for line draws

      // Draw constellation lines between particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Line color is a blend of the two particles
            ctx.strokeStyle = p1.colorPrefix + alpha + ')';
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }

        // Draw connection to mouse cursor
        const mouse = mouseRef.current;
        if (mouse.active && mouse.x !== null && mouse.y !== null) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_DIST) {
            const alpha = (1 - dist / MOUSE_DIST) * 0.32;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            
            ctx.strokeStyle = p1.colorPrefix + alpha + ')';
            ctx.lineWidth = 1.0;
            
            // Add subtle glow to cursor-attached lines
            ctx.shadowBlur = 4;
            ctx.shadowColor = p1.colorPrefix + '0.5)';
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Mouse Listeners globally on window to avoid blocking container clicks
    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
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
