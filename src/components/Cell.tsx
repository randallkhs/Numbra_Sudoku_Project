import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  const selectCell = useGameStore(state => state.selectCell);
  const [bloom, setBloom] = useState(false);
  
  useEffect(() => {
    if (triggerBloom) {
      setBloom(true);
      const to = setTimeout(() => setBloom(false), 1000);
      return () => clearTimeout(to);
    }
  }, [triggerBloom]);

  // Highlight logic
  let isSelected = false;
  let isRelated = false;
  let isSameValue = false;
  
  if (selectedCell) {
    const [sRow, sCol] = selectedCell;
    const sValue = useGameStore.getState().board[sRow]?.[sCol]?.value;
    
    isSelected = sRow === row && sCol === col;
    
    const sameBlock = Math.floor(sRow / 3) === Math.floor(row / 3) && 
                      Math.floor(sCol / 3) === Math.floor(col / 3);
                      
    isRelated = !isSelected && (sRow === row || sCol === col || sameBlock);
    
    isSameValue = !isSelected && sValue !== 0 && cellState.value === sValue;
  }

  const borderClasses = cn(
    col !== 8 && 'border-r border-game-border border-r-[1px]',
    row !== 8 && 'border-b border-game-border border-b-[1px]',
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: delayIndex * 0.01, type: 'spring' }}
      whileTap={{ scale: 0.9 }}
      onClick={() => selectCell(row, col)}
      className={cn(
        'w-full aspect-square flex items-center justify-center text-lg sm:text-2xl font-medium cursor-pointer transition-colors duration-200 select-none relative',
        borderClasses,
        bloom && 'animate-bloom',
        cellState.isError ? 'bg-game-error-bg text-game-error' : 
        isSelected ? 'bg-gradient-to-br from-game-accent-start/40 to-game-accent-end/40 text-white shadow-[inset_0_0_12px_var(--color-game-accent-start)] z-10 border-game-accent-light' :
        isSameValue ? 'bg-game-accent-subtle text-game-accent-light z-0' :
        isRelated ? 'bg-game-surface z-0' : 'hover:bg-game-surface-hover z-0',
        cellState.isInitial ? 'text-game-text-primary font-semibold' : 'text-game-accent-light font-light'
      )}
    >
      {cellState.value !== 0 ? (
        <motion.span
          key={`${row}-${col}-${cellState.value}`}
          initial={!cellState.isInitial ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            cellState.isError && 'animate-[shake_0.4s_ease-in-out]'
          )}
        >
          {cellState.value}
        </motion.span>
      ) : (
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-0.5 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <div key={n} className="flex items-center justify-center text-[8px] sm:text-[10px] text-game-text-secondary font-mono leading-none">
               {cellState.notes.has(n) ? n : ''}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
