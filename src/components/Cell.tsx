import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useGameStore } from '../store/gameStore';

interface CellProps {
  row: number;
  col: number;
  delayIndex: number;
  triggerBloom?: boolean;
}

export const Cell: React.FC<CellProps> = ({ row, col, delayIndex, triggerBloom }) => {
  const cellState = useGameStore(state => state.board[row][col]);
  const selectedCell = useGameStore(state => state.selectedCell);
  const scanningCell = useGameStore(state => state.scanningCell);
  
  // Reactively track the selected cell's value so same-value highlighting updates dynamically
  const selectedCellValue = useGameStore(state => {
    if (!state.selectedCell) return null;
    return state.board[state.selectedCell[0]][state.selectedCell[1]].value;
  });

  const selectCell = useGameStore(state => state.selectCell);
  const [bloom, setBloom] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);
  
  useEffect(() => {
    if (triggerBloom) {
      setBloom(true);
      const to = setTimeout(() => setBloom(false), 1000);
      return () => clearTimeout(to);
    }
  }, [triggerBloom]);

  // Read only the relevant animation events for this cell
  const animationEvents = useGameStore(state => state.animationEvents);

  const events = React.useMemo(() => {
    return animationEvents.filter(e => {
      if (e.type === 'cell-correct') {
        return e.row === row && e.col === col;
      }
      if (e.type === 'note-removed') {
        return e.row === row && e.col === col;
      }
      if (e.type === 'cell-error') {
        return (e.row === row && e.col === col) || 
               e.conflicts?.some(([r, c]) => r === row && c === col);
      }
      if (e.type === 'unit-complete') {
        return e.cells.some(([r, c]) => r === row && c === col);
      }
      return false;
    });
  }, [animationEvents, row, col]);

  const recentError = events.find(e => e.type === 'cell-error' && Date.now() - e.createdAt < 800);
  const recentCorrect = events.find(e => e.type === 'cell-correct' && Date.now() - e.createdAt < 800);
  const recentUnit = events.find(e => e.type === 'unit-complete' && Date.now() - e.createdAt < 1200);

  // Highlight logic
  let isSelected = false;
  let isRelated = false;
  let isSameValue = false;
  let isScanned = false;
  
  if (scanningCell) {
    isScanned = scanningCell[0] === row && scanningCell[1] === col;
  }
  
  if (selectedCell && !isScanned) {
    const [sRow, sCol] = selectedCell;
    const sValue = selectedCellValue;
    
    isSelected = sRow === row && sCol === col;
    
    const sameBlock = Math.floor(sRow / 3) === Math.floor(row / 3) && 
                      Math.floor(sCol / 3) === Math.floor(col / 3);
                      
    isRelated = !isSelected && (sRow === row || sCol === col || sameBlock);
    
    isSameValue = !isSelected && sValue !== 0 && cellState.value === sValue;
  }

  const borderClasses = cn(
    col !== 8 && 'border-r border-game-border border-r-[1px]',
    row !== 8 && 'border-b border-game-border border-b-[1px]'
  );

  // Dynamic animation configurations
  let cellAnimate: any = {};
  let cellTransition: any = {};

  if (reducedMotion) {
    // Elegant opacity crossfades
    if (recentError && recentError.type === 'cell-error') {
      const isOwner = recentError.row === row && recentError.col === col;
      cellAnimate = isOwner 
        ? {
            backgroundColor: ["var(--color-game-surface)", "var(--color-game-error-bg)", "var(--color-game-surface)"],
            opacity: [1, 0.4, 1]
          }
        : {
            backgroundColor: ["var(--color-game-surface)", "rgba(239, 68, 68, 0.08)", "var(--color-game-surface)"],
            opacity: [1, 0.6, 1]
          };
      cellTransition = { duration: 0.6 };
    } else if (recentCorrect) {
      cellAnimate = { opacity: [1, 0.5, 1] };
      cellTransition = { duration: 0.5 };
    } else if (recentUnit) {
      cellAnimate = { opacity: [1, 0.4, 1] };
      cellTransition = { duration: 0.6 };
    } else {
      cellAnimate = {
        opacity: 1,
        scale: 1,
        boxShadow: isSelected ? "inset 0 0 12px var(--color-game-accent-start)" : "inset 0 0 0px transparent"
      };
      cellTransition = { duration: 0.2 };
    }
  } else {
    // Rich spring-physics motion sequences
    if (recentError && recentError.type === 'cell-error') {
      const isOwner = recentError.row === row && recentError.col === col;
      cellAnimate = isOwner 
        ? {
            x: [0, -10, 8, -6, 4, -2, 0],
            rotate: [0, -1.8, 1.5, -1.0, 0.5, -0.2, 0],
            scale: [1, 0.95, 1.02, 1],
            backgroundColor: ["var(--color-game-surface)", "var(--color-game-error-bg)", "var(--color-game-surface)"],
          }
        : {
            scale: [1, 1.05, 1.05, 1],
            boxShadow: [
              "inset 0 0 0px transparent",
              "inset 0 0 16px var(--color-game-error)",
              "inset 0 0 16px var(--color-game-error)",
              "inset 0 0 0px transparent"
            ],
            backgroundColor: ["var(--color-game-surface)", "var(--color-game-error-bg)", "var(--color-game-surface)"],
          };
      cellTransition = { duration: isOwner ? 0.45 : 0.6, ease: "easeInOut" };
    } else if (recentCorrect) {
      cellAnimate = {
        scale: [1, 1.2, 0.95, 1],
        backgroundColor: ["var(--color-game-surface)", "rgba(16, 185, 129, 0.15)", "var(--color-game-surface)"],
      };
      cellTransition = { duration: 0.5, ease: "easeOut" };
    } else if (recentUnit && recentUnit.type === 'unit-complete') {
      const cellIndexInUnit = recentUnit.cells.findIndex(([r, c]) => r === row && c === col);
      const delay = cellIndexInUnit !== -1 ? cellIndexInUnit * 0.04 : 0;
      cellAnimate = {
        scale: [1, 1.15, 0.95, 1],
        backgroundColor: [
          "var(--color-game-surface)",
          "var(--color-game-accent-start)",
          "var(--color-game-accent-subtle)",
          "var(--color-game-surface)"
        ],
      };
      cellTransition = {
        delay,
        duration: 0.6,
        ease: "easeInOut"
      };
    } else {
      // Default cell interactive transition
      cellAnimate = isSelected ? {
        opacity: 1,
        scale: 1,
        boxShadow: [
          "inset 0 0 12px var(--color-game-accent-start)",
          "inset 0 0 24px var(--color-game-accent-light)",
          "inset 0 0 12px var(--color-game-accent-start)"
        ]
      } : { 
        opacity: 1, 
        scale: 1,
        boxShadow: "inset 0 0 0px transparent"
      };
      cellTransition = { 
        duration: 0.3, delay: delayIndex * 0.005, type: 'spring',
        boxShadow: isSelected ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { duration: 0.2 }
      };
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={cellAnimate}
      transition={cellTransition}
      whileTap={{ scale: 0.9 }}
      onClick={() => selectCell(row, col)}
      className={cn(
        'w-full h-full flex items-center justify-center text-lg sm:text-2xl font-medium cursor-pointer transition-colors duration-200 select-none relative',
        borderClasses,
        bloom && 'animate-bloom',
        cellState.isError ? 'bg-game-error-bg text-game-error' : 
        isScanned ? 'bg-white shadow-[0_0_20px_white] z-50 transition-none scale-105 duration-75' :
        isSelected ? 'bg-gradient-to-br from-game-accent-start/40 to-game-accent-end/40 text-white z-10 border-game-accent-light' :
        isSameValue ? 'bg-game-accent-subtle text-game-accent-light z-0' :
        isRelated ? 'bg-game-surface animate-crosshair z-0' : 'bg-game-surface hover:bg-game-surface-hover z-0',
        cellState.isInitial ? 'text-game-text-primary font-semibold' : 'text-game-accent-light font-light'
      )}
    >
      {cellState.value !== 0 ? (
        <>
          {recentError && recentError.type === 'cell-error' && recentError.row === row && recentError.col === col && !reducedMotion && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0.8 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border border-game-error pointer-events-none z-30"
              style={{
                borderColor: "var(--color-game-error)",
                boxShadow: "0 0 12px var(--color-game-error)",
              }}
            />
          )}
          <motion.div
            key={`${row}-${col}-${cellState.value}`}
            initial={!cellState.isInitial ? { scale: 0.3, opacity: 0 } : false}
            animate={{ 
              scale: isSameValue ? [1, 1.2, 1] : 1, 
              opacity: 1, 
              color: cellState.isError ? 'var(--color-game-error)' : undefined
            }}
            transition={{ 
              type: 'spring', stiffness: 500, damping: 15, mass: 1,
              scale: isSameValue ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : { type: 'spring', stiffness: 600, damping: 12 }
            }}
            className={cn(
              cellState.isError && !reducedMotion && 'animate-[shake_0.4s_ease-in-out]'
            )}
          >
            {cellState.value}
          </motion.div>
        </>
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div key={n} className="flex items-center justify-center text-[8px] sm:text-[10px] text-game-text-secondary font-mono leading-none">
               <AnimatePresence>
                 {cellState.notes.has(n) && (
                   <motion.span
                     initial={{ opacity: 0, scale: 0.4 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={reducedMotion ? { opacity: 0 } : { scale: 0, opacity: 0, rotate: -45 }}
                     transition={{ duration: 0.2 }}
                   >
                     {n}
                   </motion.span>
                 )}
               </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
