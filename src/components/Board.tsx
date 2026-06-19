import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Cell } from './Cell';

export function Board() {
  const board = useGameStore(state => state.board);
  const isWon = useGameStore(state => state.isWon);
  const completedLines = useGameStore(state => state.completedLines);
  const solution = useGameStore(state => state.solution);
  const clearOldAnimationEvents = useGameStore(state => state.clearOldAnimationEvents);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Periodic event cleanup to prevent memory leaks
  useEffect(() => {
    const timer = setInterval(() => {
      clearOldAnimationEvents(2000); // sweep away events older than 2 seconds
    }, 1000);
    return () => clearInterval(timer);
  }, [clearOldAnimationEvents]);

  const currentCombo = useGameStore(state => state.currentCombo);

  if (!board.length) return null;

  const gameKey = solution.length > 0 ? solution[0].join('') : 'init';

  // Board-level animation on win
  const winAnimation = reducedMotion ? {
    opacity: 1,
    scale: 1,
  } : { 
    rotateX: [0, 8, 0], 
    scale: [1, 1.03, 1],
    boxShadow: [
      "0 0 0px 0px rgba(0,0,0,0)",
      "0 0 40px 10px var(--color-game-accent-start)",
      "0 0 20px 5px var(--color-game-accent-subtle)"
    ]
  };

  // Dynamic glow classes based on current flow state/combo
  let comboGlowClass = "border-game-border-strong shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]";
  if (!isWon) {
    if (currentCombo >= 8) {
      comboGlowClass = "border-game-accent-light shadow-[0_0_35px_var(--color-game-accent-end),_inset_0_0_20px_rgba(0,0,0,0.4)]";
    } else if (currentCombo >= 5) {
      comboGlowClass = "border-game-accent-light/80 shadow-[0_0_20px_var(--color-game-accent-start),_inset_0_0_20px_rgba(0,0,0,0.4)]";
    } else if (currentCombo >= 3) {
      comboGlowClass = "border-game-border-strong shadow-[0_0_12px_rgba(79,70,229,0.45),_inset_0_0_20px_rgba(0,0,0,0.4)]";
    } else if (currentCombo >= 2) {
      comboGlowClass = "border-game-border-strong shadow-[0_0_8px_rgba(79,70,229,0.2),_inset_0_0_20px_rgba(0,0,0,0.4)]";
    }
  }

  return (
    <div className="relative w-full max-w-[420px] mx-auto px-2 sm:px-4 py-2 sm:py-4 perspective-1000">
      <motion.div
        key={gameKey}
        role="grid"
        aria-label="Sudoku Board"
        initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
        animate={isWon ? winAnimation : { opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: isWon ? 1.5 : 0.6, ease: isWon ? "easeInOut" : "easeOut" }}
        className={`w-full aspect-square grid grid-cols-9 grid-rows-9 bg-game-surface/80 border-[2.5px] rounded-[24px] overflow-hidden backdrop-blur-xl relative transition-all duration-500 ease-out ring-1 ring-white/10 ring-inset shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] ${comboGlowClass}`}
      >
        {/* Thick Block dividers mapping the 3x3 layout globally with increased visual crispness */}
        <div className="absolute top-0 bottom-0 left-[calc(100%/3)] w-[2.5px] bg-game-border-strong opacity-90 z-20 pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-[calc(100%*2/3)] w-[2.5px] bg-game-border-strong opacity-90 z-20 pointer-events-none" />
        <div className="absolute left-0 right-0 top-[calc(100%/3)] h-[2.5px] bg-game-border-strong opacity-90 z-20 pointer-events-none" />
        <div className="absolute left-0 right-0 top-[calc(100%*2/3)] h-[2.5px] bg-game-border-strong opacity-90 z-20 pointer-events-none" />

        {/* Dynamic board-wide light sweep animation on win */}
        {isWon && !reducedMotion && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-[sweep_3.5s_infinite_ease-in-out_0.5s]" />
          </div>
        )}

        {board.map((rowArr, rIdx) => (
          <div key={rIdx} role="row" className="contents">
            {rowArr.map((cell, cIdx) => {
              const isCompletedRow = completedLines.some(l => l.type === 'row' && l.index === rIdx);
              const isCompletedCol = completedLines.some(l => l.type === 'col' && l.index === cIdx);
              const isCompletedBlock = completedLines.some(l => l.type === 'block' && l.index === (Math.floor(rIdx/3)*3 + Math.floor(cIdx/3)));

              return (
                <Cell 
                  key={`${rIdx}-${cIdx}`} 
                  row={rIdx} 
                  col={cIdx} 
                  delayIndex={rIdx * 9 + cIdx} 
                  triggerBloom={isCompletedRow || isCompletedCol || isCompletedBlock}
                />
              )
            })}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
