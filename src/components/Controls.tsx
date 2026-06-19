import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Eraser, RotateCcw, Play, Pause, Lightbulb, Undo, Redo } from 'lucide-react';
import { cn } from '../lib/utils';
import React from 'react';

export const Controls: React.FC = () => {
  const { 
    eraseCell, 
    isPaused, 
    togglePause, 
    startNewGame, 
    difficulty, 
    revealHint, 
    isScanning,
    undo,
    redo,
    undoStack,
    redoStack,
    isWon
  } = useGameStore();

  const isUndoEnabled = !isWon && !isPaused && !isScanning && undoStack.length > 0;
  const isRedoEnabled = !isWon && !isPaused && !isScanning && redoStack.length > 0;
  const isControlDisabled = isWon || isPaused || isScanning;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="flex justify-center items-center w-full max-w-[420px] mx-auto px-4 py-4 flex-wrap gap-x-2 sm:gap-x-4 gap-y-4"
    >
      <ControlButton 
        icon={<Undo size={22} />} 
        label="Undo" 
        onClick={undo} 
        disabled={!isUndoEnabled}
      />
      <ControlButton 
        icon={<Redo size={22} />} 
        label="Redo" 
        onClick={redo} 
        disabled={!isRedoEnabled}
      />
      <ControlButton 
        icon={<RotateCcw size={22} />} 
        label="Restart" 
        onClick={() => startNewGame(difficulty)} 
        disabled={isScanning}
      />
      <ControlButton 
        icon={<Eraser size={22} />} 
        label="Erase" 
        onClick={eraseCell} 
        disabled={isControlDisabled}
      />
      <ControlButton 
        icon={<Lightbulb size={22} className={isScanning ? "animate-pulse text-amber-300" : ""} />} 
        label="Hint" 
        onClick={revealHint} 
        isActive={isScanning}
        disabled={isControlDisabled}
      />
      <ControlButton 
        icon={isPaused ? <Play size={22} /> : <Pause size={22} />} 
        label={isPaused ? "Resume" : "Pause"} 
        onClick={togglePause} 
        disabled={isWon || isScanning}
      />
    </motion.div>
  );
}

interface ControlButtonProps {
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon, label, onClick, isActive, disabled }) => {
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 focus:outline-none select-none transition-opacity duration-200",
        disabled ? "opacity-35 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <div className={cn(
        "w-11 h-11 sm:w-12 sm:h-12 rounded-[16px] flex items-center justify-center border transition-all duration-200 shadow-[0_10px_25px_rgba(0,0,0,0.15)]",
        isActive 
          ? "bg-gradient-to-r from-game-accent-start to-game-accent-end text-white shadow-[0_10px_25px_var(--color-game-accent-subtle)] border-none" 
          : "bg-game-surface border-game-border text-game-text-primary hover:bg-white/[0.04]"
      )}>
        {icon}
      </div>
      <span className="text-[9px] sm:text-[10px] font-semibold tracking-[0.5px] uppercase text-game-text-secondary mt-1">{label}</span>
    </motion.button>
  );
}
