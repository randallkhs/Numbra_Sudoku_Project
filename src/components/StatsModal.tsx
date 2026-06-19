import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { X, Trophy, Timer, Flame, Award, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { StatsChart } from './StatsChart';
import { ProgressionChart } from './ProgressionChart';
import { ConsistencyGauge } from './ConsistencyGauge';
import { DifficultyAverages } from './DifficultyAverages';

export const StatsModal: React.FC = () => {
  const { showStats, toggleStats, stats } = useGameStore();
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');

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
                "w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative border flex flex-col max-h-[80vh]",
                "bg-[var(--color-game-bg-start)] text-[var(--color-game-text-primary)] border-[var(--color-game-border)]"
              )}
            >
              <button 
                onClick={toggleStats}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-[var(--color-game-surface)] border border-transparent transition-colors z-10"
                aria-label="Close stats"
              >
                <X className="w-5 h-5 opacity-70 hover:opacity-100" />
              </button>

              <h2 className="text-2xl font-bold font-sans tracking-tight mb-6">Player Profile</h2>

              <div className="flex bg-[var(--color-game-surface)] p-1 rounded-2xl mb-6 relative border border-[var(--color-game-border)]">
                <button 
                  onClick={() => setActiveTab('stats')}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold uppercase tracking-wider rounded-xl transition-all z-10",
                    activeTab === 'stats' ? "text-white" : "text-[var(--color-game-text-secondary)] hover:text-white"
                  )}
                >
                  Stats
                </button>
                <button 
                  onClick={() => setActiveTab('achievements')}
                  className={cn(
                    "flex-1 py-2 text-sm font-semibold uppercase tracking-wider rounded-xl transition-all z-10",
                    activeTab === 'achievements' ? "text-white" : "text-[var(--color-game-text-secondary)] hover:text-white"
                  )}
                >
                  Achievements
                </button>
                {/* Visual indicator */}
                <motion.div 
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-[var(--color-game-accent-start)] to-[var(--color-game-accent-end)] rounded-xl opacity-90 shadow-lg"
                  animate={{ left: activeTab === 'stats' ? '4px' : 'calc(50%)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
                <AnimatePresence mode="wait">
                  {activeTab === 'stats' ? (
                    <motion.div
                      key="stats"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)] relative overflow-hidden group hover:border-[var(--color-game-accent-light)] transition-colors">
                        <Trophy className="w-8 h-8 text-[var(--color-game-accent-light)] mb-2 relative z-10" />
                        <span className="text-3xl font-mono font-medium relative z-10">{stats.gamesWon}</span>
                        <span className="text-xs uppercase tracking-wider text-[var(--color-game-text-secondary)] mt-1 font-sans relative z-10 text-center">Games Won</span>
                      </div>
                      
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)] relative overflow-hidden group hover:border-[#ff4500] transition-colors">
                        <Flame className="w-8 h-8 text-[#ff4500] mb-2 relative z-10" />
                        <span className="text-3xl font-mono font-medium relative z-10">{stats.currentStreak}</span>
                        <span className="text-xs uppercase tracking-wider text-[var(--color-game-text-secondary)] mt-1 font-sans relative z-10 text-center">Current Streak</span>
                      </div>

                      <div className="col-span-2 flex items-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)]">
                        <div className="flex bg-[var(--color-game-accent-subtle)] p-3 rounded-xl mr-4">
                          <Timer className="w-6 h-6 text-[var(--color-game-accent-light)]" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm text-[var(--color-game-text-secondary)] uppercase tracking-wider">Average Time</span>
                          <span className="text-2xl font-mono">{formatTime(stats.averageTime)}</span>
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center p-4 rounded-2xl bg-[var(--color-game-surface)] border border-[var(--color-game-border)]">
                        <div className="flex bg-[#00ffaa]/20 p-3 rounded-xl mr-4">
                          <Zap className="w-6 h-6 text-[#00ffaa]" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm text-[var(--color-game-text-secondary)] uppercase tracking-wider">Fastest Finish</span>
                          <span className="text-2xl font-mono text-[#00ffaa]">
                            {stats.fastestFinish !== null && stats.fastestFinish !== undefined ? formatTime(stats.fastestFinish) : '--:--'}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ConsistencyGauge />
                        <DifficultyAverages />
                      </div>

                      <div className="col-span-2 flex flex-col gap-4">
                        <StatsChart />
                        <ProgressionChart />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="achievements"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-3"
                    >
                       {[
                         { id: 'Complete 10 games', desc: 'Finished 10 sudoku puzzles', icon: <Trophy size={20} /> },
                         { id: 'No mistakes', desc: 'Solved a puzzle flawlessly', icon: <Award size={20} /> },
                         { id: 'Fastest finish', desc: 'Set a new personal best time', icon: <Zap size={20} /> }
                       ].map(achm => {
                         const unlocked = stats.achievements?.includes(achm.id);
                         return (
                           <div key={achm.id} className={cn(
                             "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                             unlocked 
                              ? "bg-[var(--color-game-surface)] border-[var(--color-game-accent-start)] shadow-[0_0_15px_var(--color-game-accent-subtle)]" 
                              : "bg-[var(--color-game-surface)]/50 border-[var(--color-game-border)] opacity-60"
                           )}>
                             <div className={cn(
                               "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                               unlocked ? "bg-[var(--color-game-accent-start)] text-white" : "bg-gray-800 text-gray-500"
                             )}>
                               {achm.icon}
                             </div>
                             <div className="flex flex-col">
                               <span className={cn("text-base font-bold", unlocked ? "text-white" : "text-gray-400")}>{achm.id}</span>
                               <span className="text-xs text-[var(--color-game-text-secondary)]">{achm.desc}</span>
                             </div>
                           </div>
                         );
                       })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
