import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { Award, Clock, AlertTriangle, Lightbulb, Zap, Share2, Play, Check } from 'lucide-react';

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export function SurpriseOverlay() {
  const isWon = useGameStore(state => state.isWon);
  const lastSurprise = useGameStore(state => state.lastSurprise);
  const maxComboThisGame = useGameStore(state => state.maxComboThisGame);
  const clearSurprise = useGameStore(state => state.clearSurprise);

  const difficulty = useGameStore(state => state.difficulty);
  const timeElapsed = useGameStore(state => state.timeElapsed);
  const mistakes = useGameStore(state => state.mistakes);
  const hintsUsed = useGameStore(state => state.hintsUsed);
  const startNewGame = useGameStore(state => state.startNewGame);

  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (isWon && !reducedMotion) {
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 40 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { 
          particleCount, 
          origin: { x: Math.random(), y: Math.random() - 0.2 }, 
          colors: ['#4f46e5', '#7c3aed', '#818cf8', '#ffffff'] 
        }));
      }, 250);
    }
  }, [isWon, reducedMotion]);

  useEffect(() => {
    if (lastSurprise) {
      const timer = setTimeout(() => {
        clearSurprise();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSurprise, clearSurprise]);

  const handleShare = async () => {
    const shareText = `⚡ Numbra Sudoku Completed! ⚡
🏆 Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
⏱️ Time: ${formatTime(timeElapsed)}
❌ Mistakes: ${mistakes}/3
💡 Hints Used: ${hintsUsed}
🔥 Max Flow Combo: ${maxComboThisGame} Hits

Play Numbra Sudoku and feel the flow!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Numbra Sudoku Completed',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
        // fallback
        fallbackCopy(shareText);
      }
    } else {
      fallbackCopy(shareText);
    }
  };

  const fallbackCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy results:', err);
    }
  };

  const animationProps = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    : {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
        transition: { type: 'spring', stiffness: 300, damping: 25 }
      };

  return (
    <AnimatePresence>
      {isWon && (
        <motion.div
          key="win-overlay"
          {...animationProps}
          className="absolute inset-0 z-50 bg-game-bg-start/90 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto"
        >
          {/* Main Glow Premium Victory Card */}
          <div className="w-full max-w-[380px] bg-game-surface/85 border border-white/10 p-6 rounded-[24px] shadow-2xl backdrop-blur-xl relative flex flex-col gap-5 overflow-hidden">
            {/* Visual shine sweep accent across the card */}
            <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[sweep_4s_infinite_ease-in-out_2s]" />

            <div className="text-center">
              <span className="text-[10px] font-mono tracking-[0.2em] text-game-accent-light uppercase bg-game-accent-subtle border border-game-accent-start/35 px-3 py-1 rounded-full inline-block mb-2">
                REVEAL COMPLETED
              </span>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-game-accent-start to-game-accent-end tracking-tight">
                Numbra Solved
              </h2>
            </div>

            {/* Stats list with consistent and humble layouts */}
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-game-text-secondary text-[10px]">
                  <Award className="w-3.5 h-3.5 text-game-accent-light" />
                  <span>DIFFICULTY</span>
                </div>
                <span className="text-sm font-bold text-game-text-primary uppercase">
                  {difficulty}
                </span>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-game-text-secondary text-[10px]">
                  <Clock className="w-3.5 h-3.5 text-game-accent-light" />
                  <span>PLAY TIME</span>
                </div>
                <span className="text-sm font-bold text-game-text-primary">
                  {formatTime(timeElapsed)}
                </span>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-game-text-secondary text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-game-accent-light" />
                  <span>MISTAKES</span>
                </div>
                <span className="text-sm font-bold text-game-text-primary">
                  {mistakes}/3
                </span>
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-[16px] p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-game-text-secondary text-[10px]">
                  <Lightbulb className="w-3.5 h-3.5 text-game-accent-light" />
                  <span>HINTS USED</span>
                </div>
                <span className="text-sm font-bold text-game-text-primary">
                  {hintsUsed}
                </span>
              </div>

              {maxComboThisGame >= 2 && (
                <div className="bg-game-accent-subtle/50 border border-game-accent-start/20 rounded-[16px] p-3 col-span-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-game-accent-light text-[11px] font-bold">
                    <Zap className="w-4 h-4 text-game-accent-light animate-pulse" />
                    <span>MAX FLOW COMBO</span>
                  </div>
                  <span className="text-base font-extrabold text-game-text-primary">
                    {maxComboThisGame} Hits
                  </span>
                </div>
              )}
            </div>

            {/* Elegant control buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => startNewGame(difficulty)}
                className="w-full bg-gradient-to-r from-game-accent-start to-game-accent-end hover:opacity-95 text-white py-3 rounded-[16px] font-semibold flex items-center justify-center gap-2 text-sm shadow-[0_8px_20px_var(--color-game-accent-subtle)] active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Same Difficulty</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShare}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-game-text-primary border border-white/10 py-3 rounded-[16px] font-medium flex items-center justify-center gap-2 text-sm transition-all active:scale-98 cursor-pointer relative overflow-hidden"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-game-accent-light" />
                      <span>Share Result</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => startNewGame(difficulty === 'easy' ? 'medium' : difficulty === 'medium' ? 'hard' : 'easy')}
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-game-text-primary border border-white/10 py-3 rounded-[16px] font-medium flex items-center justify-center gap-2 text-sm transition-all active:scale-98 cursor-pointer"
                >
                  <span>Next Level</span>
                </button>
              </div>
            </div>

            {/* Quick clean selector for other difficulties */}
            <div className="border-t border-white/5 pt-3.5 text-center flex flex-col gap-1.5">
              <span className="text-[10px] font-mono tracking-wider text-game-text-secondary uppercase">
                START ANOTHER DIFFICULTY
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => startNewGame(diff)}
                    className="py-1.5 rounded-[10px] border border-white/5 bg-white/[0.02] hover:bg-white/10 text-game-text-primary capitalize transition-all cursor-pointer"
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {lastSurprise === 'bruh' && (
        <SurpriseMessage key="surprise-bruh" emoji="🤦‍♂️" text="Bruh... 3 mistakes! Let's focus." />
      )}
      
      {lastSurprise === 'wrong_number' && (
        <SurpriseMessage key="surprise-wrong" emoji="🚨" text="Oops, incorrect logic!" />
      )}

      {lastSurprise === 'lucky_7' && (
        <SurpriseMessage key="surprise-lucky" emoji="🎰" text="Lucky 7 right in the center!" />
      )}

      {lastSurprise === 'line_clear' && (
        <SurpriseMessage key="surprise-clear" emoji="✨" text="Section unlocked!" />
      )}
    </AnimatePresence>
  );
}

function SurpriseMessage({ emoji, text, durationMs = 3000, title = "THE SYSTEM SAYS:", key }: { emoji: string, text: string, durationMs?: number, title?: string, key?: string | number }) {
  return (
    <motion.div
      key={key}
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
