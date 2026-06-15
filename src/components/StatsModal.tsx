import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { X, Trophy, Timer, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

export const StatsModal: React.FC = () => {
  const { showStats, toggleStats, stats } = useGameStore();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {showStats && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleStats}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative border",
                "bg-[var(--color-game-bg-start)] text-[var(--color-game-text-primary)] border-[var(--color-game-border)]"
              )}
            >
              <button 
                onClick={toggleStats}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--color-game-surface)] border border-transparent transition-colors"
                aria-label="Close stats"
              >
                <X className="w-5 h-5 opacity-70 hover:opacity-100" />
              </button>

              <h2 className="text-2xl font-bold font-sans tracking-tight mb-8">Statistics</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)]">
                  <Trophy className="w-8 h-8 text-[var(--color-game-accent-light)] mb-2" />
                  <span className="text-3xl font-mono font-medium">{stats.gamesWon}</span>
                  <span className="text-xs uppercase tracking-wider text-[var(--color-game-text-secondary)] mt-1 font-sans">Games Won</span>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)]">
                  <Flame className="w-8 h-8 text-[#ff4500] mb-2" />
                  <span className="text-3xl font-mono font-medium">{stats.currentStreak}</span>
                  <span className="text-xs uppercase tracking-wider text-[var(--color-game-text-secondary)] mt-1 font-sans">Current Streak</span>
                </div>

                <div className="col-span-2 flex items-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)]">
                  <div className="flex bg-[var(--color-game-accent-subtle)] p-3 rounded-xl mr-4">
                    <Timer className="w-6 h-6 text-[var(--color-game-accent-light)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-[var(--color-game-text-secondary)] uppercase tracking-wider">Average Time</span>
                    <span className="text-2xl font-mono">{formatTime(stats.averageTime)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
