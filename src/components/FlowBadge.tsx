import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Flame } from 'lucide-react';

export function FlowBadge() {
  const currentCombo = useGameStore(state => state.currentCombo);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  if (currentCombo < 2) return null;

  let badgeText = '';
  let badgeColorClass = '';
  let glowColor = '';
  
  if (currentCombo === 2) {
    badgeText = "Flow x2";
    badgeColorClass = "bg-game-accent-subtle text-game-accent-light border-game-accent-start/35";
    glowColor = "shadow-[0_0_15px_rgba(79,70,229,0.3)]";
  } else if (currentCombo >= 3 && currentCombo <= 4) {
    badgeText = "Sharp Mind";
    badgeColorClass = "bg-game-accent-subtle/80 text-game-accent-light border-game-accent-light/50";
    glowColor = "shadow-[0_0_20px_var(--color-game-accent-light)]";
  } else if (currentCombo >= 5 && currentCombo <= 7) {
    badgeText = "Locked In";
    badgeColorClass = "bg-gradient-to-r from-game-accent-start/30 to-game-accent-end/30 text-game-text-primary border-game-accent-end/50";
    glowColor = "shadow-[0_0_25px_var(--color-game-accent-end)]";
  } else {
    badgeText = "Numbra Mode ⚡";
    badgeColorClass = "bg-gradient-to-r from-game-accent-start to-game-accent-end text-white border-white/45 font-bold animate-pulse";
    glowColor = "shadow-[0_0_35px_var(--color-game-accent-end),_inset_0_0_10px_rgba(255,255,255,0.2)]";
  }

  const animationProps = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    : {
        initial: { opacity: 0, y: -10, scale: 0.9 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -5, scale: 0.95 },
        transition: { type: "spring", stiffness: 400, damping: 25 }
      };

  return (
    <div className="flex justify-center w-full my-1 pointer-events-none z-10">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`combo-${badgeText}`}
          {...animationProps}
          className={`px-4 py-1.5 rounded-full border text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-md transition-all duration-300 ${badgeColorClass} ${glowColor}`}
        >
          <Flame className="w-3.5 h-3.5 animate-bounce" />
          <span>{badgeText}</span>
          <span className="font-bold border-l pl-1.5 border-current/20">{currentCombo} Hits</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
