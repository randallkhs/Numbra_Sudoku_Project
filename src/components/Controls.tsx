import { motion } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Pencil, Eraser, RotateCcw, Play, Pause, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState } from 'react';

export const Controls: React.FC = () => {
  const { notesMode, toggleNotesMode, eraseCell, isPaused, togglePause, startNewGame, difficulty, board, theme, aiEnabled } = useGameStore();
  const [loadingHint, setLoadingHint] = useState(false);

  const getAIHint = async () => {
    if (loadingHint) return;
    setLoadingHint(true);
    try {
      const simplifiedGrid = board.map(row => row.map(c => c.value));
      const res = await fetch('/api/ai/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid: simplifiedGrid, theme })
      });
      const data = await res.json();
      if (data.text) {
        useGameStore.setState({ lastSurprise: `ai_hint:${data.text}` });
      } else if (data.error) {
        useGameStore.setState({ lastSurprise: `ai_hint:Mmm, mi cerebro cósmico está descansando. ¡Sigue intentando!` });
      }
    } catch (e) {
      console.error(e);
      useGameStore.setState({ lastSurprise: `ai_hint:Mmm, los astros me impiden ver la pista ahora. ¡Tú puedes, genio!` });
    } finally {
      setLoadingHint(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="flex justify-around items-center w-full max-w-[400px] mx-auto px-6 py-4 flex-wrap gap-y-4"
    >
      <ControlButton 
        icon={<RotateCcw size={24} />} 
        label="Restart" 
        onClick={() => startNewGame(difficulty)} 
      />
      <ControlButton 
        icon={<Eraser size={24} />} 
        label="Erase" 
        onClick={eraseCell} 
      />
      {aiEnabled && (
        <ControlButton 
          icon={<Sparkles size={24} className={loadingHint ? "animate-pulse text-purple-400" : ""} />} 
          label="AI Hint" 
          onClick={getAIHint} 
          isActive={loadingHint}
        />
      )}
      <ControlButton 
        icon={<Pencil size={24} />} 
        label="Notes" 
        onClick={toggleNotesMode} 
        isActive={notesMode}
      />
      <ControlButton 
        icon={isPaused ? <Play size={24} /> : <Pause size={24} />} 
        label={isPaused ? "Resume" : "Pause"} 
        onClick={togglePause} 
      />
    </motion.div>
  );
}

interface ControlButtonProps {
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  isActive?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon, label, onClick, isActive }) => {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 focus:outline-none"
    >
      <div className={cn(
        "w-12 h-12 rounded-[16px] flex items-center justify-center border transition-all duration-200 shadow-[0_10px_25px_rgba(0,0,0,0.2)]",
        isActive 
          ? "bg-gradient-to-r from-game-accent-start to-game-accent-end text-white shadow-[0_10px_25px_var(--color-game-accent-subtle)] border-none" 
          : "bg-game-surface border-game-border text-game-text-primary hover:bg-game-surface-hover"
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-semibold tracking-[1px] uppercase text-game-text-secondary mt-1">{label}</span>
    </motion.button>
  );
}
