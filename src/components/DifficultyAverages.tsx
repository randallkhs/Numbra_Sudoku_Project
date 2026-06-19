import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useGameStore } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { Timer, Award, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// Format seconds into digital-style "m:ss"
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const DifficultyAverages: React.FC = () => {
  const { stats } = useGameStore();
  const history = useMemo(() => stats.history || [], [stats.history]);

  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

  // Compute calculated averages per difficulty
  const averages = useMemo(() => {
    return difficulties.map(diff => {
      const items = history.filter(h => h.difficulty === diff);
      const times = items.map(h => h.timeElapsed);
      const count = items.length;
      
      const averageTime = count > 0 ? Math.round(d3.mean(times) || 0) : null;

      // Base target benchmarks for each level
      const targetTime = {
        easy: 240,    // 4 mins
        medium: 480,  // 8 mins
        hard: 840,    // 14 mins
        expert: 1320  // 22 mins
      }[diff];

      // Calculate progress percentage relative to standard targets
      let progressPercent = 0;
      if (averageTime) {
        // Lower time relative to target means better/faster performance. Let's showcase it!
        progressPercent = Math.min(100, Math.round((targetTime / averageTime) * 100));
      }

      return {
        difficulty: diff,
        averageTime,
        targetTime,
        count,
        progressPercent
      };
    });
  }, [history]);

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-game-text-secondary)] flex items-center gap-1.5">
          <Timer size={12} className="text-[var(--color-game-accent-light)]" /> Speed per difficulty
        </span>
        <span className="text-[9px] font-mono font-bold text-white/40 uppercase">
          Dynamic Metrics
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {averages.map((avg) => (
          <div 
            key={`avg-${avg.difficulty}`} 
            className="flex flex-col gap-1.5 p-2.5 bg-white/[0.01] border border-white/5 rounded-xl hover:border-[var(--color-game-accent-light)]/20 transition-all group"
          >
            <div className="flex justify-between items-center text-[10px] uppercase font-mono font-bold">
              <span className="text-slate-200 group-hover:text-[var(--color-game-accent-light)] transition-colors">
                {avg.difficulty}
              </span>
              <span className="text-white">
                {avg.averageTime ? (
                  <span className="flex items-center gap-1 text-[var(--color-game-accent-light)] font-bold">
                    <CheckCircle size={10} className="text-emerald-400" /> {formatTime(avg.averageTime)}
                  </span>
                ) : (
                  <span className="text-white/40 font-normal">No solves</span>
                )}
              </span>
            </div>

            {/* Micro Progress Track */}
            <div className="relative w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              {avg.averageTime ? (
                <div 
                  style={{ width: `${avg.progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-[var(--color-game-accent-start)] to-[var(--color-game-accent-light)] rounded-full transition-all duration-500"
                />
              ) : (
                <div className="h-full w-4 bg-white/10 rounded-full animate-pulse" />
              )}
            </div>

            <div className="flex justify-between items-center text-[9px] text-[var(--color-game-text-secondary)] font-mono">
              <span>Target: {formatTime(avg.targetTime)}</span>
              <span>Solves: {avg.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
