import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Cell } from './Cell';

export function Board() {
  const board = useGameStore(state => state.board);
  const isWon = useGameStore(state => state.isWon);
  const completedLines = useGameStore(state => state.completedLines);

  if (!board.length) return null;

  return (
    <div className="relative w-full max-w-[400px] mx-auto p-4 perspective-1000">
      <motion.div
        animate={isWon ? { 
          rotateX: [0, 10, 0], 
          scale: [1, 1.05, 1],
          boxShadow: [
            "0 0 0px 0px rgba(0,0,0,0)",
            "0 0 40px 10px var(--color-game-accent-start)",
            "0 0 20px 5px var(--color-game-accent-subtle)"
          ]
        } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="w-full aspect-square grid grid-cols-9 bg-game-surface border-[2px] border-game-border-strong rounded-[20px] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md relative"
      >
        {/* Thick Block dividers mapping the 3x3 layout globally */}
        <div className="absolute top-0 bottom-0 left-[calc(100%/3)] w-[2px] bg-game-border-strong z-20 pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-[calc(100%*2/3)] w-[2px] bg-game-border-strong z-20 pointer-events-none" />
        <div className="absolute left-0 right-0 top-[calc(100%/3)] h-[2px] bg-game-border-strong z-20 pointer-events-none" />
        <div className="absolute left-0 right-0 top-[calc(100%*2/3)] h-[2px] bg-game-border-strong z-20 pointer-events-none" />

        {board.map((row, rIdx) => (
          row.map((cell, cIdx) => {
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
          })
        ))}
      </motion.div>
    </div>
  );
}
