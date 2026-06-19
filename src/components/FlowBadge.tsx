import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore, MistakeShieldState } from '../store/gameStore';
import { Flame, Shield, ShieldAlert } from 'lucide-react';

export function FlowBadge() {
  const currentCombo = useGameStore(state => state.currentCombo);
  const mistakeShieldState = useGameStore(state => state.mistakeShieldState);
  
  const [localShieldState, setLocalShieldState] = useState<MistakeShieldState>('locked');
  const [showSpentFeedback, setShowSpentFeedback] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (mistakeShieldState === 'locked') {
      setLocalShieldState('locked');
      setShowSpentFeedback(false);
    } else if (mistakeShieldState === 'armed') {
      setLocalShieldState('armed');
      setShowSpentFeedback(false);
    } else if (mistakeShieldState === 'spent') {
      if (localShieldState === 'armed') {
        setShowSpentFeedback(true);
        const timer = setTimeout(() => {
          setShowSpentFeedback(false);
          setLocalShieldState('spent');
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        setLocalShieldState('spent');
      }
    }
  }, [mistakeShieldState, localShieldState]);

  const hasContentToShow = currentCombo >= 2 || localShieldState === 'armed' || showSpentFeedback;
  if (!hasContentToShow) return null;

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
      <div className="flex flex-row items-center justify-center gap-3">
        <AnimatePresence mode="popLayout">
          {currentCombo >= 2 && (
            <motion.div
              key={`combo-${badgeText}`}
              {...animationProps}
              className={`px-4 py-1.5 rounded-full border text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-md transition-all duration-300 ${badgeColorClass} ${glowColor}`}
            >
              <Flame className="w-3.5 h-3.5 animate-bounce" />
              <span>{badgeText}</span>
              <span className="font-bold border-l pl-1.5 border-current/20">{currentCombo} Hits</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="popLayout">
          {(localShieldState === 'armed' || showSpentFeedback) && (
            <motion.div
              key="mistake-shield"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5, rotate: -20 }}
              animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 10 }}
              transition={{ type: "spring", stiffness: 350, damping: 22 }}
              className={`px-3 py-1.5 rounded-full border text-xs font-mono tracking-wider flex items-center gap-1.5 backdrop-blur-md transition-all duration-300 z-20 ${
                localShieldState === 'armed' && !showSpentFeedback
                  ? 'bg-game-accent-subtle/85 text-game-accent-light border-game-accent-light/50 shadow-[0_0_15px_var(--color-game-accent-light)]'
                  : 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.45)]'
              }`}
            >
              {localShieldState === 'armed' && !showSpentFeedback ? (
                <>
                  <motion.div
                    animate={reducedMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="flex items-center justify-center text-game-accent-light"
                  >
                    <Shield className="w-3.5 h-3.5 fill-current" />
                  </motion.div>
                  <span className="text-[10px] uppercase font-bold tracking-widest animate-pulse">Shield Armed</span>
                </>
              ) : (
                <>
                  {!reducedMotion && (
                    <motion.div
                      animate={{ scale: [1, 2.2, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 rounded-full border border-red-500 pointer-events-none"
                    />
                  )}
                  <motion.div
                    animate={reducedMotion ? {} : { scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                    className="flex items-center justify-center text-red-400"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 fill-current text-red-500" />
                  </motion.div>
                  <span className="text-[10px] uppercase font-semibold text-red-400">Flow Protected</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
