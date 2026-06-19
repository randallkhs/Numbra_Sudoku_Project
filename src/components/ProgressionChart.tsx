import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { useGameStore, GameHistoryEntry } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { TrendingUp, Award, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

// Helper to format time as digital count (m:ss)
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

interface DotData {
  x: number;
  y: number;
  time: number;
  difficulty: Difficulty;
  index: number;
  date: string;
}

export const ProgressionChart: React.FC = () => {
  const { stats } = useGameStore();

  const history = useMemo(() => stats.history || [], [stats.history]);

  // Group history by difficulty to keep tracking series distinct
  const groupedHistory = useMemo(() => {
    const result: Record<Difficulty, GameHistoryEntry[]> = {
      easy: [],
      medium: [],
      hard: [],
      expert: []
    };
    history.forEach(entry => {
      if (result[entry.difficulty]) {
        result[entry.difficulty].push(entry);
      }
    });
    return result;
  }, [history]);

  // Baseline standard benchmarks for when user doesn't have enough data
  const targetBaselines: Record<Difficulty, number[]> = {
    easy: [260, 230, 200, 180, 160],
    medium: [540, 490, 440, 400, 370],
    hard: [900, 820, 750, 680, 620],
    expert: [1400, 1250, 1150, 1050, 950]
  };

  const [activeDiff, setActiveDiff] = useState<Difficulty>('easy');
  const [hoveredDot, setHoveredDot] = useState<DotData | null>(null);

  // Width and height details
  const width = 310;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 38 };

  const activeUserSolves = useMemo(() => {
    return groupedHistory[activeDiff];
  }, [groupedHistory, activeDiff]);

  // Decide X range (number of games plotted)
  // Let's plot the last 5 games. If there are fewer than 5, we pad with empty entries or show the baseline.
  const xMaxPoints = 5;

  const yScale = useMemo(() => {
    const defaultMaxTime = {
      easy: 320,
      medium: 650,
      hard: 1050,
      expert: 1600
    }[activeDiff];

    const maxHistoryTime = activeUserSolves.length > 0 
      ? d3.max(activeUserSolves, (d: GameHistoryEntry) => d.timeElapsed) || defaultMaxTime
      : defaultMaxTime;

    const yMax = Math.max(maxHistoryTime, defaultMaxTime) * 1.15;

    return d3.scaleLinear()
      .domain([0, yMax])
      .range([height - padding.bottom, padding.top]);
  }, [activeUserSolves, activeDiff, height, padding.bottom, padding.top]);

  // X scale maps sequence indexes [0..4] to chart width
  const xScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, xMaxPoints - 1])
      .range([padding.left, width - padding.right]);
  }, [width, padding.left, padding.right, xMaxPoints]);

  // Line generators
  const lineGenerator = useMemo(() => {
    return d3.line<{ x: number; y: number }>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveMonotoneX);
  }, []);

  // Compute points for baseline curves
  const baselinePoints = useMemo(() => {
    return targetBaselines[activeDiff].map((time, idx) => {
      const x = xScale(idx);
      const y = yScale(time);
      return { x, y };
    });
  }, [activeDiff, xScale, yScale]);

  const baselinePath = useMemo(() => {
    return lineGenerator(baselinePoints) || '';
  }, [baselinePoints, lineGenerator]);

  // Compute points for actual user solves (last 5 solves)
  const userPoints = useMemo(() => {
    const recentSolves = activeUserSolves.slice(-xMaxPoints);
    return recentSolves.map((solve, idx) => {
      const x = xScale(idx);
      const y = yScale(solve.timeElapsed);
      return { 
        x, 
        y, 
        time: solve.timeElapsed,
        difficulty: solve.difficulty,
        index: idx + 1,
        date: solve.date
      };
    });
  }, [activeUserSolves, xScale, yScale, xMaxPoints]);

  const userPath = useMemo(() => {
    if (userPoints.length < 2) return '';
    return lineGenerator(userPoints.map(p => ({ x: p.x, y: p.y }))) || '';
  }, [userPoints, lineGenerator]);

  // Standard Y Ticks
  const yTicks = useMemo(() => {
    const domainMax = yScale.domain()[1];
    const ticks: number[] = [];
    const step = Math.ceil((domainMax / 4) / 60) * 60; // 1-minute blocks
    for (let curr = 0; curr <= domainMax; curr += step) {
      ticks.push(curr);
    }
    return ticks;
  }, [yScale]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-game-text-secondary)] flex items-center gap-1.5 animate-pulse">
          <TrendingUp size={12} className="text-[var(--color-game-accent-light)]" /> Solves over time
        </span>
        <span className="text-[9px] font-mono font-bold text-white/50 uppercase">
          Timeline progress
        </span>
      </div>

      {/* Difficulty select tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.02] rounded-xl border border-white/5">
        {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => (
          <button
            key={`prog-tab-${diff}`}
            onClick={() => setActiveDiff(diff)}
            className={cn(
              "text-[10px] uppercase font-bold py-1.5 rounded-lg transition-all border border-transparent",
              activeDiff === diff
                ? "bg-[var(--color-game-accent-subtle)] text-[var(--color-game-accent-light)] border-[var(--color-game-accent-light)]/25"
                : "text-[var(--color-game-text-secondary)] hover:text-white"
            )}
          >
            {diff.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="relative flex items-center justify-center min-h-[180px]">
        <svg 
          width={width} 
          height={height} 
          className="overflow-visible select-none"
        >
          <defs>
            <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-game-accent-light)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-game-accent-light)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid Guidlines */}
          {yTicks.map((val, idx) => (
            <g key={`prog-grid-${val}`}>
              <line 
                x1={padding.left}
                x2={width - padding.right}
                y1={yScale(val)}
                y2={yScale(val)}
                stroke="var(--color-game-border)"
                strokeOpacity={0.25}
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={yScale(val) + 3}
                className="text-[9px] font-mono fill-[var(--color-game-text-secondary)] text-right"
                textAnchor="end"
              >
                {Math.floor(val / 60)}m
              </text>
            </g>
          ))}

          {/* Target Baseline curve */}
          <motion.path 
            d={baselinePath}
            fill="none"
            stroke="var(--color-game-text-secondary)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeOpacity={0.3}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          />

          {/* Actual User solves Line Path */}
          {userPath ? (
            <g>
              <motion.path 
                d={userPath}
                fill="none"
                stroke="var(--color-game-accent-light)"
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </g>
          ) : null}

          {/* User Solve dots */}
          {userPoints.map((pt, i) => (
            <g key={`user-pt-${i}`}>
              <circle 
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill="url(#ring-glow)"
                className="opacity-70 animate-pulse"
              />
              <motion.circle 
                cx={pt.x}
                cy={pt.y}
                r={5}
                fill="var(--color-game-accent-light)"
                stroke="white"
                strokeWidth={1.5}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 2 / 2, opacity: 1 }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                className="cursor-pointer hover:scale-125 transition-transform"
                onMouseEnter={() => setHoveredDot(pt)}
                onMouseLeave={() => setHoveredDot(null)}
              />
            </g>
          ))}

          {/* X indexes / solve order */}
          {Array.from({ length: xMaxPoints }).map((_, idx) => (
            <text
              key={`prog-x-label-${idx}`}
              x={xScale(idx)}
              y={height - padding.bottom + 16}
              className="text-[9px] font-mono fill-[var(--color-game-text-secondary)] text-center font-bold"
              textAnchor="middle"
            >
              #{idx + 1}
            </text>
          ))}
        </svg>

        {/* Floating custom tooltip detail popover */}
        <AnimatePresence>
          {hoveredDot && (
            <div 
              style={{
                position: 'absolute',
                left: `${hoveredDot.x}px`,
                top: `${hoveredDot.y - 10}px`
              }}
              className="z-50 pointer-events-none transform -translate-x-[50%] -translate-y-full bg-slate-900/95 border border-white/20 p-2.5 rounded-xl shadow-xl flex flex-col gap-0.5 text-[10px] font-mono w-[130px] backdrop-blur-md"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
                <span className="font-bold text-white text-[8px] uppercase">
                  Solve #{hoveredDot.index}
                </span>
                <span className="text-[9px] text-[var(--color-game-accent-light)] font-bold">
                  {formatTime(hoveredDot.time)}
                </span>
              </div>
              <span className="text-[9px] text-white/50">{hoveredDot.date}</span>
            </div>
          )}
        </AnimatePresence>

        {/* If user has no solved games for this difficulty, explain overlaid benchmark */}
        {userPoints.length === 0 && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center p-6 text-center">
            <HelpCircle size={22} className="text-white/40 mb-1.5" />
            <p className="text-[10px] font-sans text-white/60 font-medium">No games won yet on {activeDiff}.</p>
            <p className="text-[9px] font-mono text-white/45 mt-0.5 max-w-[170px]">Overlaid benchmark (dashed line) shows standard target learning curve.</p>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center text-[9.5px] font-mono border-t border-white/5 pt-2 text-[var(--color-game-text-secondary)]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--color-game-accent-light)] inline-block border border-white/20" />
          <span>Real Speed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-0.5 bg-white/40 inline-block border-t border-dashed" />
          <span>Baseline Curve</span>
        </div>
      </div>
    </div>
  );
};
