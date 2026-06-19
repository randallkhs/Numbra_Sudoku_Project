import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { useGameStore } from '../store/gameStore';
import { Award, ShieldAlert, Sparkles } from 'lucide-react';

export const ConsistencyGauge: React.FC = () => {
  const { stats } = useGameStore();
  const history = useMemo(() => stats.history || [], [stats.history]);

  // Calculate stats based on history
  const { consistencyPercentage, rating, maxStreak, perfectSolves } = useMemo(() => {
    if (history.length === 0) {
      // Default baseline values when there's no custom history yet
      return {
        consistencyPercentage: 85,
        rating: 'Elite Solver',
        maxStreak: stats.currentStreak || 0,
        perfectSolves: 0
      };
    }

    const totalGames = history.length;
    // Perfect solves are games completed with 0 mistakes
    const perfects = history.filter(h => h.mistakes === 0).length;
    // Calculate consistency: higher weight on 0 mistakes, medium weight on 1 mistake, low weight on 2 mistakes
    const totalMistakesScore = history.reduce((acc, curr) => acc + (2 - Math.min(curr.mistakes, 2)), 0);
    const maxPossibleScore = totalGames * 2;
    const computedPercentage = Math.round((totalMistakesScore / maxPossibleScore) * 100);

    let compRating = 'Initiate';
    if (computedPercentage >= 90) compRating = 'Numbra Master';
    else if (computedPercentage >= 75) compRating = 'Zen Adept';
    else if (computedPercentage >= 50) compRating = 'Steady Solver';

    return {
      consistencyPercentage: Math.max(10, Math.min(computedPercentage, 100)),
      rating: compRating,
      maxStreak: stats.currentStreak,
      perfectSolves: perfects
    };
  }, [history, stats.currentStreak]);

  // Setup radial chart variables
  const width = 180;
  const height = 110;
  const radius = 80;
  const thickness = 14;

  // D3 calculations for arcs
  const arcScale = d3.scaleLinear()
    .domain([0, 100])
    .range([-Math.PI / 2, Math.PI / 2]);

  const backgroundArc = useMemo(() => {
    return d3.arc<any>()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(Math.PI / 2)
      .cornerRadius(6)(null as any);
  }, [radius, thickness]);

  const foregroundArc = useMemo(() => {
    const endAngle = arcScale(consistencyPercentage);
    return d3.arc<any>()
      .innerRadius(radius - thickness)
      .outerRadius(radius)
      .startAngle(-Math.PI / 2)
      .endAngle(endAngle)
      .cornerRadius(6)(null as any);
  }, [consistencyPercentage, arcScale, radius, thickness]);

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden h-full justify-between">
      <div className="w-full flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-game-text-secondary)] flex items-center gap-1.5">
          <Sparkles size={12} className="text-[var(--color-game-accent-light)]" /> Solve Consistency
        </span>
        <span className="text-[9px] font-mono font-bold text-white/40 uppercase">
          Precision Dial
        </span>
      </div>

      {/* SVG Canvas for D3 gauge */}
      <div className="relative flex items-center justify-center mt-2" style={{ width, height }}>
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--color-game-accent-start)" />
              <stop offset="100%" stopColor="var(--color-game-accent-light)" />
            </linearGradient>
            <radialGradient id="thumb-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-game-accent-light)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-game-accent-light)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Group transformed to centered bottom of arc */}
          <g transform={`translate(${width / 2}, ${height - 15})`}>
            {/* Background Arc */}
            <path 
              d={backgroundArc || ''} 
              fill="var(--color-game-border)" 
              opacity={0.2}
            />

            {/* Glowing Active Arc */}
            <path 
              d={foregroundArc || ''} 
              fill="url(#gauge-grad)" 
            />

            {/* Dial Tick Dividers */}
            {[25, 50, 75].map((tick) => {
              const angle = arcScale(tick);
              const innerX = Math.sin(angle) * (radius - thickness);
              const innerY = -Math.cos(angle) * (radius - thickness);
              const outerX = Math.sin(angle) * radius;
              const outerY = -Math.cos(angle) * radius;

              return (
                <line
                  key={`gauge-tick-${tick}`}
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke="var(--color-game-bg-end)"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        </svg>

        {/* Center score readout */}
        <div className="absolute bottom-3 flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight text-white leading-none">
            {consistencyPercentage}%
          </span>
          <span className="text-[9px] font-mono text-[var(--color-game-accent-light)] uppercase font-extrabold tracking-widest mt-1.5 px-2 py-0.5 rounded-full bg-[var(--color-game-accent-subtle)] border border-[var(--color-game-accent-light)]/20 animate-pulse">
            {rating}
          </span>
        </div>
      </div>

      {/* Info descriptors */}
      <div className="w-full grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mt-1">
        <div className="flex flex-col items-center p-1.5 bg-white/[0.01] rounded-xl border border-white/5">
          <span className="text-[9pt] font-mono text-[var(--color-game-text-secondary)]">Perfects</span>
          <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
            <Award size={10} /> {perfectSolves}
          </span>
        </div>
        <div className="flex flex-col items-center p-1.5 bg-white/[0.01] rounded-xl border border-white/5">
          <span className="text-[9pt] font-mono text-[var(--color-game-text-secondary)]">Streak</span>
          <span className="text-xs font-mono font-bold text-[var(--color-game-accent-light)] mt-0.5 flex items-center gap-1">
            <ShieldAlert size={10} className="text-[var(--color-game-accent-light)]" /> {maxStreak}
          </span>
        </div>
      </div>
    </div>
  );
};
