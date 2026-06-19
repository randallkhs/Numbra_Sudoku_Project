import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore, getLocalDateString, getYesterdayDateString, DailyChallengeResult } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { X, Calendar, ChevronLeft, ChevronRight, Award, Clock, AlertTriangle, Lightbulb, Zap, Share2, Play, Check, Flame } from 'lucide-react';
import { cn } from '../lib/utils';

interface DailyChallengeModalProps {
  onClose: () => void;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const DailyChallengeModal: React.FC<DailyChallengeModalProps> = ({ onClose }) => {
  const { 
    startDailyChallenge, 
    dailyHistory, 
    dailyStreak,
    isDailyChallenge,
    dailyChallengeDate,
    dailyChallengeDifficulty
  } = useGameStore();

  const [testDate, setTestDate] = useState<string>(getLocalDateString());
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [copied, setCopied] = useState(false);

  // Helper to change active date by offset
  const shiftDate = (days: number) => {
    const current = new Date(testDate + "T12:00:00");
    current.setDate(current.getDate() + days);
    setTestDate(getLocalDateString(current));
  };

  // Find any previous attempts on this selected date and difficulty
  const prevResult = dailyHistory.find(
    h => h.date === testDate && h.difficulty === selectedDifficulty && !h.isPractice
  );

  // Find any practice attempts on this selected date and difficulty
  const practiceResult = dailyHistory.find(
    h => h.date === testDate && h.difficulty === selectedDifficulty && h.isPractice
  );

  // Is today's selected challenge already solved?
  const isSolved = !!prevResult;

  const handleStartGame = (practice: boolean = false) => {
    startDailyChallenge(selectedDifficulty, testDate, practice);
    onClose();
  };

  const handleShareResult = async (result: DailyChallengeResult) => {
    const formattedDiff = result.difficulty.charAt(0).toUpperCase() + result.difficulty.slice(1);
    const flowText = result.maxCombo >= 2 ? `\nMax Flow Combo: ${result.maxCombo} Hit(s)` : '\nMax Flow Combo: 0';
    const streakText = `\nDaily Streak: ${dailyStreak.currentStreak} day(s)`;
    const shareText = `Numbra Sudoku Daily Challenge 📅 ${result.date}
Difficulty: ${formattedDiff}
Played as: ${result.isPractice ? 'Practice Replay' : 'Official Challenge'}
Time: ${formatTime(result.timeElapsed)}
Mistakes: ${result.mistakes}/3
Hints Used: ${result.hintsUsed}${flowText}${streakText}
Play here: ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Numbra Daily Challenge Result',
          text: shareText
        });
      } catch (err) {
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
      console.error('Failed to copy daily result:', err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="w-full max-w-[390px] bg-game-bg-start border border-white/10 rounded-[28px] shadow-2xl p-6 relative flex flex-col gap-5 overflow-hidden"
      >
        {/* Subtle decorative background glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-game-accent-light/10 blur-3xl pointer-events-none rounded-full" />

        {/* Modal Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-game-accent-light" />
            <h3 className="text-lg font-bold text-game-text-primary tracking-wide">Daily Challenge</h3>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full w-8 h-8 flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] text-game-text-secondary hover:text-game-text-primary transition-all duration-200 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Streak Stats Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/25 rounded-[20px] p-4 flex justify-between items-center relative overflow-hidden">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[18px]">
              🔥
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[0.1em] text-amber-400 block uppercase">STREAK TRACKER</span>
              <span className="text-sm font-bold text-game-text-primary">
                {dailyStreak.currentStreak} Day{dailyStreak.currentStreak !== 1 ? 's' : ''} Current
              </span>
            </div>
          </div>
          <div className="text-right flex flex-col">
            <span className="text-[9px] font-mono text-game-text-secondary uppercase">PERSONAL BEST</span>
            <span className="text-sm font-extrabold text-amber-300 font-mono">
              {dailyStreak.bestStreak}
            </span>
          </div>
        </div>

        {/* Date Selector & Navigator */}
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[10px] font-mono tracking-wider text-game-text-secondary uppercase px-1">
            CHALLENGE DATE
          </span>
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/5 rounded-2xl p-1">
            <button 
              onClick={() => shiftDate(-1)}
              className="p-2 bg-transparent hover:bg-white/[0.04] text-game-text-secondary hover:text-game-text-primary rounded-xl transition-all cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex flex-col items-center">
              <input 
                type="date" 
                value={testDate} 
                onChange={(e) => {
                  if (e.target.value) setTestDate(e.target.value);
                }}
                className="bg-transparent text-center font-mono text-xs text-game-text-primary font-bold focus:outline-none border-b border-transparent hover:border-game-accent-start transition-all cursor-pointer uppercase py-1"
              />
              {testDate === getLocalDateString() && (
                <span className="text-[9px] font-mono tracking-tight text-game-accent-light uppercase">
                  (TODAY'S SPECIAL)
                </span>
              )}
            </div>

            <button 
              onClick={() => shiftDate(1)}
              disabled={testDate === getLocalDateString()}
              className="p-2 bg-transparent hover:bg-white/[0.04] text-game-text-secondary hover:text-game-text-primary disabled:opacity-20 disabled:cursor-not-allowed rounded-xl transition-all cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Difficulty Selector Row */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono tracking-wider text-game-text-secondary uppercase px-1">
            SELECT DIFFICULTY
          </span>
          <div className="grid grid-cols-4 gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-2xl">
            {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={cn(
                  "py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all duration-300 cursor-pointer",
                  selectedDifficulty === diff
                    ? "bg-gradient-to-r from-game-accent-start to-game-accent-end text-white"
                    : "text-game-text-secondary hover:text-game-text-primary hover:bg-white/[0.04]"
                )}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Inner Challenge Info Card */}
        <div className="flex flex-col gap-3 py-1">
          {isSolved ? (
            <div className="bg-game-accent-subtle/30 border border-game-accent-start/20 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-game-accent-light flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Challenge Completed!
                </span>
                <span className="text-[9px] font-mono bg-game-accent-subtle border border-game-accent-light/40 px-2 py-0.5 rounded-full text-game-text-primary">
                  OFFICIAL RUN
                </span>
              </div>

              {/* Complete stat widgets for successful first runs */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-game-text-secondary mb-0.5">PLAY TIME</span>
                  <span className="font-bold text-game-text-primary flex items-center gap-1.5">
                    <Clock size={12} className="text-game-accent-light" />
                    {formatTime(prevResult.timeElapsed)}
                  </span>
                </div>
                <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-game-text-secondary mb-0.5">MISTAKES</span>
                  <span className="font-bold text-game-text-primary flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-game-accent-light" />
                    {prevResult.mistakes}/3
                  </span>
                </div>
                <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-game-text-secondary mb-0.5">HINTS USED</span>
                  <span className="font-bold text-game-text-primary flex items-center gap-1.5">
                    <Lightbulb size={12} className="text-game-accent-light" />
                    {prevResult.hintsUsed}
                  </span>
                </div>
                <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-game-text-secondary mb-0.5">MAX FLOW</span>
                  <span className="font-bold text-game-text-primary flex items-center gap-1.5">
                    <Zap size={12} className="text-game-accent-light" />
                    {prevResult.maxCombo} Hits
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleShareResult(prevResult)}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-game-text-primary border border-white/10 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-game-accent-light" />
                      <span>Share Stats</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleStartGame(true)}
                  className="flex-1 bg-gradient-to-r from-game-accent-start to-game-accent-end hover:opacity-95 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Practice Replay</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold text-game-text-secondary block">
                Today's seed puzzle is ready and waiting. Solve it to increment your Daily Streak!
              </span>
              <button
                onClick={() => handleStartGame(false)}
                className="w-full bg-gradient-to-r from-game-accent-start to-game-accent-end hover:opacity-95 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Start Daily Challenge</span>
              </button>
            </div>
          )}
        </div>

        {/* Small calendar footer hint */}
        <div className="flex gap-2 items-center justify-center text-[10px] font-mono text-game-text-secondary text-center">
          <span>Seed ID:</span>
          <span className="text-game-accent-light font-bold">
            numbra-daily-{selectedDifficulty}-{testDate}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};
