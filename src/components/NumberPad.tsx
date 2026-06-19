import React from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { cn } from '../lib/utils';

export const NumberPad: React.FC = () => {
  const inputNumber = useGameStore(state => state.inputNumber);
  const isPaused = useGameStore(state => state.isPaused);
  const isWon = useGameStore(state => state.isWon);
  const isScanning = useGameStore(state => state.isScanning);

  const disabled = isPaused || isWon || isScanning;

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
      whileTap={!disabled ? { scale: 0.94, y: 1 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-[62px] w-full max-w-[62px] rounded-[20px] text-[22px] font-semibold flex items-center justify-center transition-all duration-150 select-none border border-white/5",
        disabled ? "opacity-20 cursor-not-allowed bg-game-surface border-game-border text-game-text-primary shadow-none" : 
        "bg-game-surface border-game-border text-game-text-primary hover:bg-white/[0.04] hover:shadow-[0_8px_20px_-5px_var(--color-game-accent-subtle)] active:shadow-none translate-y-0 hover:-translate-y-0.5 cursor-pointer shadow-[0_6px_15px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className
      )}
    >
      {num}
    </motion.button>
  );
}
