import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';

const PARTICLE_COUNT = 80;

const colors = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', 
  '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', 
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'
];

interface ParticleProps {
  index: number;
}

const Particle: React.FC<ParticleProps> = ({ index }) => {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 600);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate random explosion paths based on index
  const angle = (Math.random() * Math.PI * 2); 
  const velocity = 20 + Math.random() * 80; // Distance modifier
  const size = 6 + Math.random() * 8; // Size

  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Starting point (center but slightly dispersed)
  const x0 = (Math.random() - 0.5) * 50;
  const y0 = (Math.random() - 0.5) * 50;

  // Endpoint
  const x1 = Math.cos(angle) * velocity * 5;
  const y1 = Math.sin(angle) * velocity * 5 + 200; // gravity effect

  const duration = 1.5 + Math.random() * 1.5;
  const delay = Math.random() * 0.2;

  // Type of shape
  const shapeType = Math.floor(Math.random() * 3);

  return (
    <motion.div
      initial={{ 
        x: x0, 
        y: y0, 
        scale: 0, 
        rotate: 0, 
        opacity: 1 
      }}
      animate={{ 
        x: [x0, x1 * 0.8, x1], 
        y: [y0, y1 - 300, y1], // arc
        scale: [0, 1.5, 0.5, 0],
        rotate: [0, Math.random() * 720 - 360],
        opacity: [1, 1, 0]
      }}
      transition={{ 
        duration, 
        delay, 
        ease: "easeOut",
        times: [0, 0.4, 1]
      }}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: shapeType === 0 ? '50%' : shapeType === 1 ? '10%' : '2px', // circles, squares, lines
        transformOrigin: 'center',
        zIndex: 100,
        pointerEvents: 'none'
      }}
    />
  );
};

export const Confetti: React.FC = () => {
  const isWon = useGameStore(state => state.isWon);
  const [show, setShow] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (isWon) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isWon]);

  const activeParticleCount = reducedMotion ? 12 : PARTICLE_COUNT;

  return (
    <AnimatePresence>
      {show && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[100]" style={{ perspective: '1000px' }}>
          {Array.from({ length: activeParticleCount }).map((_, i) => (
            <Particle key={i} index={i} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
