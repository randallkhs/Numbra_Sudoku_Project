import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { useGameStore, GameHistoryEntry } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { Clock, Info } from 'lucide-react';
import { cn } from '../lib/utils';

// Format seconds into digital-style "m:ss" or just "m min" for axis
const formatAxisTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};

const formatTooltipTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Reference baseline points to maintain a beautiful distribution range
const REFERENCE_SOLVES: GameHistoryEntry[] = [
  { difficulty: 'easy', timeElapsed: 190, date: 'Baseline', isDaily: false, mistakes: 0 },
  { difficulty: 'easy', timeElapsed: 250, date: 'Baseline', isDaily: true, mistakes: 1 },
  { difficulty: 'easy', timeElapsed: 310, date: 'Baseline', isDaily: false, mistakes: 0 },
  
  { difficulty: 'medium', timeElapsed: 410, date: 'Baseline', isDaily: false, mistakes: 1 },
  { difficulty: 'medium', timeElapsed: 490, date: 'Baseline', isDaily: true, mistakes: 0 },
  { difficulty: 'medium', timeElapsed: 580, date: 'Baseline', isDaily: false, mistakes: 2 },
  
  { difficulty: 'hard', timeElapsed: 720, date: 'Baseline', isDaily: true, mistakes: 0 },
  { difficulty: 'hard', timeElapsed: 850, date: 'Baseline', isDaily: false, mistakes: 1 },
  { difficulty: 'hard', timeElapsed: 980, date: 'Baseline', isDaily: false, mistakes: 2 },
  
  { difficulty: 'expert', timeElapsed: 1100, date: 'Baseline', isDaily: true, mistakes: 1 },
  { difficulty: 'expert', timeElapsed: 1260, date: 'Baseline', isDaily: false, mistakes: 0 },
  { difficulty: 'expert', timeElapsed: 1450, date: 'Baseline', isDaily: true, mistakes: 2 },
];

export const StatsChart: React.FC = () => {
  const { stats } = useGameStore();

  const realSolves: GameHistoryEntry[] = useMemo(() => {
    return stats.history || [];
  }, [stats.history]);

  // Merge the real solves with the baseline of reference solves for an immersive scatter range
  const allPoints = useMemo(() => {
    // Flag real vs reference solves
    const realWithFlag = realSolves.map(p => ({ ...p, isReal: true }));
    const refWithFlag = REFERENCE_SOLVES.map(p => ({ ...p, isReal: false }));
    return [...refWithFlag, ...realWithFlag];
  }, [realSolves]);

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    difficulty: Difficulty;
    timeElapsed: number;
    date: string;
    mistakes: number;
    isReal: boolean;
  } | null>(null);

  // Layout parameters
  const width = 310;
  const height = 180;
  const padding = { top: 15, right: 15, bottom: 25, left: 38 };

  // Setup D3 Scales
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
  
  const xScale = useMemo(() => {
    return d3.scalePoint<Difficulty>()
      .domain(difficulties)
      .range([padding.left, width - padding.right])
      .padding(0.4);
  }, [width, padding.left, padding.right]);

  const yScale = useMemo(() => {
    const maxTime = d3.max(allPoints, (d: GameHistoryEntry) => d.timeElapsed) || 1500;
    // Cap minimum highest range to 25 mins (1500 seconds)
    const yMax = Math.max(maxTime as number, 1500) * 1.1; 
    return d3.scaleLinear()
      .domain([0, yMax])
      .range([height - padding.bottom, padding.top]);
  }, [allPoints, height, padding.bottom, padding.top]);

  // Compute ticks for Y axis
  const yTicks = useMemo(() => {
    const domainMax = yScale.domain()[1];
    // Create 4-5 nice intervals
    const step = Math.ceil((domainMax / 4) / 120) * 120; // nice 2-minute steps 
    const ticks: number[] = [];
    for (let current = 0; current <= domainMax; current += step) {
      ticks.push(current);
    }
    return ticks;
  }, [yScale]);

  // Compute vertical ranges and means for each difficulty level
  const columnData = useMemo(() => {
    return difficulties.map(diff => {
      const items = allPoints.filter(p => p.difficulty === diff);
      const times = items.map(p => p.timeElapsed);
      const min = d3.min(times) || 0;
      const max = d3.max(times) || 0;
      const avg = d3.mean(times) || 0;

      const userItems = realSolves.filter(p => p.difficulty === diff);
      const userAvg = userItems.length > 0 ? d3.mean(userItems.map(p => p.timeElapsed)) : null;

      return {
        difficulty: diff,
        min,
        max,
        avg,
        userAvg,
        cx: xScale(diff) || 0,
      };
    });
  }, [allPoints, realSolves, xScale]);

  // Helper to add slight horizontal jitter to point distribution so circles don't stack directly
  const getJitter = (index: number) => {
    // Deterministic pseudo-random offset based on index
    const shift = (Math.sin(index + 3.5) * 8);
    return shift;
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-game-text-secondary)] flex items-center gap-1">
          <Clock size={12} className="text-[var(--color-game-accent-light)]" /> Solve distribution & range
        </span>
        <span className="text-[10px] font-mono font-bold text-[var(--color-game-accent-light)] uppercase bg-[var(--color-game-accent-subtle)] px-2 py-0.5 rounded-full border border-[var(--color-game-accent-light)]/20">
          D3 engine
        </span>
      </div>

      <div className="relative flex items-center justify-center">
        <svg 
          width={width} 
          height={height} 
          className="overflow-visible select-none"
        >
          {/* Subtle definitions for high-end filters */}
          <defs>
            <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-game-accent-light)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-game-accent-light)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="column-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-game-accent-subtle)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-game-accent-subtle)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis */}
          {yTicks.map((val) => (
            <g key={`get-y-tick-${val}`} className="opacity-30">
              <line 
                x1={padding.left} 
                x2={width - padding.right} 
                y1={yScale(val)} 
                y2={yScale(val)} 
                stroke="var(--color-game-border)" 
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text 
                x={padding.left - 8} 
                y={yScale(val) + 3} 
                className="text-[9px] font-mono fill-[var(--color-game-text-secondary)] text-right"
                textAnchor="end"
              >
                {formatAxisTime(val)}
              </text>
            </g>
          ))}

          {/* Difficulty columns & Column Ranges */}
          {columnData.map((col) => {
            const yMin = yScale(col.max);
            const yMax = yScale(col.min);
            const yAvg = yScale(col.avg);

            return (
              <g key={`col-${col.difficulty}`}>
                {/* Column background capsule */}
                <rect 
                  x={col.cx - 18}
                  y={padding.top}
                  width={36}
                  height={height - padding.top - padding.bottom}
                  rx={8}
                  fill="url(#column-grad)"
                  className="transition-colors hover:fill-white/[0.02]"
                />

                {/* Min-Max range line */}
                <line 
                  x1={col.cx}
                  x2={col.cx}
                  y1={yMin}
                  y2={yMax}
                  stroke="var(--color-game-accent-light)"
                  strokeWidth={1.5}
                  opacity={0.35}
                />

                {/* Mean marker rule */}
                <line 
                  x1={col.cx - 8}
                  x2={col.cx + 8}
                  y1={yAvg}
                  y2={yAvg}
                  stroke="var(--color-game-accent-light)"
                  strokeWidth={2.5}
                  opacity={0.8}
                />
              </g>
            );
          })}

          {/* Points (Reference and User) */}
          {allPoints.map((pt, i) => {
            const cx = (xScale(pt.difficulty) || 0) + getJitter(i);
            const cy = yScale(pt.timeElapsed);

            return (
              <g key={`dot-${pt.difficulty}-${i}`}>
                {pt.isReal && (
                  <circle 
                    cx={cx}
                    cy={cy}
                    r={9}
                    fill="url(#dot-glow)"
                    className="animate-pulse"
                    pointerEvents="none"
                  />
                )}
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={pt.isReal ? 5.5 : 4} 
                  fill={pt.isReal ? "var(--color-game-accent-light)" : "var(--color-game-text-secondary)"}
                  stroke={pt.isReal ? "white" : "transparent"}
                  strokeWidth={1}
                  className={cn(
                    "cursor-pointer transition-all duration-200", 
                    pt.isReal ? "opacity-100 hover:scale-125" : "opacity-40 hover:opacity-75 hover:scale-120"
                  )}
                  onMouseEnter={() => setHoveredPoint({
                    x: cx,
                    y: cy,
                    difficulty: pt.difficulty,
                    timeElapsed: pt.timeElapsed,
                    date: pt.date,
                    mistakes: pt.mistakes,
                    isReal: !!pt.isReal
                  })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* X Axis labels */}
          {difficulties.map((diff) => {
            const xVal = xScale(diff) || 0;
            return (
              <text 
                key={`label-${diff}`} 
                x={xVal} 
                y={height - padding.bottom + 15} 
                className="text-[10px] font-mono fill-[var(--color-game-text-secondary)] font-semibold uppercase text-center"
                textAnchor="middle"
              >
                {diff.slice(0, 3)}
              </text>
            );
          })}
        </svg>

        {/* Floating Custom Tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <div 
              style={{ 
                position: 'absolute', 
                left: `${hoveredPoint.x + 8}px`, 
                top: `${hoveredPoint.y - 12}px` 
              }}
              className="z-50 pointer-events-none transform -translate-x-[50%] -translate-y-full bg-slate-900/95 border border-white/20 p-2 rounded-xl shadow-xl flex flex-col gap-0.5 text-[10px] font-mono max-w-[140px] text-left backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex justify-between items-center gap-3">
                <span className="font-bold text-white uppercase text-[8px] bg-white/10 px-1 py-0.5 rounded">
                  {hoveredPoint.difficulty}
                </span>
                <span className="text-[9px] text-[var(--color-game-accent-light)] font-bold">
                  {formatTooltipTime(hoveredPoint.timeElapsed)}
                </span>
              </div>
              <div className="flex flex-col mt-1 text-slate-300">
                <span>Mistakes: {hoveredPoint.mistakes}</span>
                <span>Type: {hoveredPoint.isReal ? 'Your solve' : 'Sample reference'}</span>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center text-[9px] font-mono text-[var(--color-game-text-secondary)] border-t border-white/5 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--color-game-accent-light)] inline-block border border-white/20" />
          <span>Your Performance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-40 inline-block" />
          <span>Sample Solves</span>
        </div>
      </div>
    </div>
  );
};
