import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Sparkles, ChevronRight, Check, X, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export const EducationalHint: React.FC = () => {
  const activeHint = useGameStore(state => state.activeHint);
  const advanceHint = useGameStore(state => state.advanceHint);
  const confirmHintReveal = useGameStore(state => state.confirmHintReveal);
  const cancelHint = useGameStore(state => state.cancelHint);

  if (!activeHint) return null;

  const { level, technique, message } = activeHint;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="w-full max-w-md bg-game-surface/95 border border-game-border-strong p-6 rounded-t-[32px] sm:rounded-[32px] shadow-2xl relative overflow-hidden backdrop-blur-xl ring-1 ring-white/10"
        >
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-game-accent-start to-blue-500" />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-game-text-secondary uppercase tracking-widest font-mono">
                  Educational Hint
                </span>
                <h3 className="text-lg font-bold text-game-text-primary tracking-tight">
                  {technique}
                </h3>
              </div>
            </div>
            <button
              onClick={cancelHint}
              className="p-1.5 rounded-full hover:bg-white/10 text-game-text-secondary hover:text-game-text-primary transition-colors focus:ring-2 focus:ring-game-accent-light"
              aria-label="Close Hint"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stage Progress tracker */}
          <div className="flex items-center gap-1.5 mb-5 select-none" aria-label="Hint Progress stages">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    level >= step 
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                      : "bg-white/10"
                  )}
                />
                {step < 4 && <div className="text-xs text-game-text-secondary/35 font-mono select-none">/</div>}
              </React.Fragment>
            ))}
          </div>

          {/* Description section */}
          <div className="min-h-[72px] bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 relative">
            <p className="text-sm text-game-text-primary leading-relaxed">
              {/* Parse nested bold markup manually cleanly without heavy dependencies */}
              {message.split('**').map((part, i) => (
                i % 2 === 1 ? <strong key={i} className="text-amber-400 font-bold">{part}</strong> : part
              ))}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={cancelHint}
              className="px-4 py-2 text-sm rounded-xl text-game-text-secondary hover:text-game-text-primary hover:bg-white/5 transition-all font-medium border border-transparent hover:border-white/10"
            >
              Close
            </button>
            {level < 4 ? (
              <button
                onClick={advanceHint}
                className="px-5 py-2.5 sm:py-2 text-sm rounded-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center gap-1.5"
              >
                Next Clue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={confirmHintReveal}
                className="px-5 py-2.5 sm:py-2 text-sm rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center gap-1.5 animate-bounce"
              >
                Reveal Cell <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
