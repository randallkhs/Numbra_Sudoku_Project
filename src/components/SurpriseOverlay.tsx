import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';

export function SurpriseOverlay() {
  const isWon = useGameStore(state => state.isWon);
  const lastSurprise = useGameStore(state => state.lastSurprise);
  const clearSurprise = useGameStore(state => state.clearSurprise);

  useEffect(() => {
    if (isWon) {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 }, colors: ['#4f46e5', '#7c3aed', '#818cf8', '#ffffff'] }));
      }, 250);
    }
  }, [isWon]);

  useEffect(() => {
    if (lastSurprise) {
      const timer = setTimeout(() => {
        clearSurprise();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSurprise, clearSurprise]);

  return (
    <AnimatePresence>
      {isWon && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 bg-game-bg-start/80 backdrop-blur-sm flex flex-col items-center justify-center p-6"
        >
          <motion.h2 
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-game-accent-start to-game-accent-end mb-4"
          >
            Brilliant!
          </motion.h2>
          <p className="text-game-text-primary text-center font-medium">
            You solved the grid.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => useGameStore.getState().startNewGame(useGameStore.getState().difficulty)}
            className="mt-8 bg-gradient-to-r from-game-accent-start to-game-accent-end text-white px-10 py-4 rounded-[18px] font-semibold text-[18px] shadow-[0_10px_25px_var(--color-game-accent-subtle)] transition-all active:scale-95 border-none"
          >
            Play Again
          </motion.button>
        </motion.div>
      )}

      {lastSurprise === 'bruh' && (
        <SurpriseMessage emoji="🤦‍♂️" text="Bruh... 3 mistakes! Let's focus." />
      )}
      
      {lastSurprise === 'wrong_number' && (
        <SurpriseMessage emoji="🚨" text="Oops, incorrect logic!" />
      )}

      {lastSurprise === 'lucky_7' && (
        <SurpriseMessage emoji="🎰" text="Lucky 7 right in the center!" />
      )}

      {lastSurprise === 'line_clear' && (
        <SurpriseMessage emoji="✨" text="Section unlocked!" />
      )}
    </AnimatePresence>
  );
}

function SurpriseMessage({ emoji, text, durationMs = 3000, title = "THE SYSTEM SAYS:" }: { emoji: string, text: string, durationMs?: number, title?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-[10px] border border-game-border shadow-2xl rounded-[15px] p-4 flex items-center gap-4 w-[90%] max-w-[320px] pointer-events-none"
    >
      <div className="w-[40px] h-[40px] bg-game-surface border border-game-border rounded-[10px] flex items-center justify-center text-[20px] shrink-0">
        {emoji}
      </div>
      <div className="flex-1">
        <span className="block text-game-text-primary text-[11px] font-semibold uppercase tracking-wider mb-0.5">{title}</span>
        <p className="text-game-text-secondary text-[10px] m-0">{text}</p>
      </div>
    </motion.div>
  );
}
