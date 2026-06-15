import React from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

export const NumberPad: React.FC = () => {
  const inputNumber = useGameStore(state => state.inputNumber);
  const isPaused = useGameStore(state => state.isPaused);
  const isWon = useGameStore(state => state.isWon);

  const disabled = isPaused || isWon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="grid grid-cols-5 gap-y-3 gap-x-3 w-full max-w-[400px] mx-auto px-6 pb-8 place-items-center"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <NumButton key={n} num={n} onClick={() => inputNumber(n)} disabled={disabled} />
      ))}
      <div className="col-span-5 flex justify-center gap-2 w-full px-4">
        {[6, 7, 8, 9].map((n) => (
          <NumButton key={n} num={n} onClick={() => inputNumber(n)} disabled={disabled} className="flex-1 max-w-[64px]" />
        ))}
      </div>
    </motion.div>
  );
}

interface NumButtonProps {
  num: number;
  onClick: () => void;
  disabled: boolean;
  className?: string;
}

const NumButton: React.FC<NumButtonProps> = ({ num, onClick, disabled, className }) => {
  return (
    <motion.button
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-[65px] w-full max-w-[65px] rounded-[18px] text-[22px] font-medium flex items-center justify-center transition-all duration-200 border",
        disabled ? "opacity-30 cursor-not-allowed bg-game-surface border-game-border text-game-text-primary" : 
        "bg-game-surface border-game-border text-game-text-primary hover:bg-game-surface-hover shadow-[0_4px_10px_rgba(0,0,0,0.1)] active:shadow-none translate-y-0 active:translate-y-1",
        className
      )}
    >
      {num}
    </motion.button>
  );
}
