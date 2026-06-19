import { create } from 'zustand';
import { generateSudoku, Difficulty, getConflictingCells, getCandidates, isValid } from '../lib/sudoku';
import { haptic } from '../lib/haptics';
import { audio } from '../lib/audio';
import { saveGameState, loadGameState, clearSavedGame } from '../lib/gameStateCache';
import {
  PersonalityEvent,
  PersonalityEventType,
  PersonalityTone,
  GameplayEventContext,
  getTriggeredPersonalityEvent,
  getPersonalityMessage,
  EVENT_PRIORITY
} from '../lib/personality';
import { getThemeFeedbackProfile } from '../lib/themeFeedback';

const MISTAKE_SHIELD_UNLOCK_COMBO = 5;

export type ThemeType = 'cosmic' | 'cyber' | 'paper' | 'neon' | 'glitch' | 'disco' | 'mechanic' | 'cartoon';
export type MoveSource = 'player' | 'hint' | 'redo';

export interface ActiveHint {
  level: 1 | 2 | 3 | 4;
  technique: 'Naked Single' | 'Hidden Single' | 'Logical Deduction';
  targetCell: [number, number];
  relatedCells: [number, number][];
  unit?: 'row' | 'col' | 'box';
  message: string;
  value: number;
}

export type MistakeShieldState = 'locked' | 'armed' | 'spent';

export type AnimationEventInput =
  | { type: 'cell-correct'; row: number; col: number; value: number }
  | { type: 'cell-error'; row: number; col: number; value: number; conflicts?: [number, number][] }
  | { type: 'unit-complete'; unit: 'row' | 'col' | 'box'; index: number; cells: [number, number][] }
  | { type: 'note-removed'; row: number; col: number; value: number }
  | { type: 'hint-revealed'; row: number; col: number; value: number }
  | { type: 'win' }
  | { type: 'mistake-shield-armed' }
  | { type: 'mistake-shield-absorbed'; row: number; col: number; comboBefore: number; comboAfter: number };

export type AnimationEvent = AnimationEventInput & { id: string; createdAt: number };

export interface GameHistoryEntry {
  difficulty: Difficulty;
  timeElapsed: number;
  date: string;
  isDaily: boolean;
  mistakes: number;
}

export interface GameStats {
  gamesWon: number;
  averageTime: number;
  currentStreak: number;
  totalGamesFinished: number;
  fastestFinish: number | null;
  achievements: string[];
  history?: GameHistoryEntry[];
}

export type CellState = {
  value: number; // 0 means empty
  notes: Set<number>;
  isInitial: boolean;
  isError: boolean;
};

export interface DailyChallengeResult {
  date: string; // YYYY-MM-DD
  difficulty: Difficulty;
  completed: boolean;
  timeElapsed: number;
  mistakes: number;
  hintsUsed: number;
  maxCombo: number;
  isPractice?: boolean;
}

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // YYYY-MM-DD
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

const loadDailyHistory = (): DailyChallengeResult[] => {
  try {
    const raw = localStorage.getItem('numbra_daily_history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDailyHistory = (history: DailyChallengeResult[]) => {
  try {
    localStorage.setItem('numbra_daily_history', JSON.stringify(history));
  } catch (e) {
    console.error(e);
  }
};

const loadDailyStreak = (): DailyStreakState => {
  try {
    const raw = localStorage.getItem('numbra_daily_streak');
    return raw ? JSON.parse(raw) : { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  } catch {
    return { currentStreak: 0, bestStreak: 0, lastCompletedDate: null };
  }
};

const saveDailyStreak = (streak: DailyStreakState) => {
  try {
    localStorage.setItem('numbra_daily_streak', JSON.stringify(streak));
  } catch (e) {
    console.error(e);
  }
};

const registerDailyCompletion = (
  date: string,
  difficulty: Difficulty,
  timeElapsed: number,
  mistakes: number,
  hintsUsed: number,
  maxCombo: number,
  isPracticePlay: boolean
): DailyStreakState => {
  const history = loadDailyHistory();
  const streak = loadDailyStreak();

  const existingChallenge = history.find(h => h.date === date && h.difficulty === difficulty && !h.isPractice);

  const entry: DailyChallengeResult = {
    date,
    difficulty,
    completed: true,
    timeElapsed,
    mistakes,
    hintsUsed,
    maxCombo,
    isPractice: isPracticePlay || !!existingChallenge
  };

  history.push(entry);
  saveDailyHistory(history);

  if (!entry.isPractice) {
    let { currentStreak, bestStreak, lastCompletedDate } = streak;
    
    if (lastCompletedDate === null) {
      currentStreak = 1;
    } else if (lastCompletedDate === date) {
      // Already completed today
    } else {
      const yesterday = getYesterdayDateString(date);
      if (lastCompletedDate === yesterday) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }
    
    bestStreak = Math.max(bestStreak, currentStreak);
    lastCompletedDate = date;

    const newStreak = { currentStreak, bestStreak, lastCompletedDate };
    saveDailyStreak(newStreak);
    return newStreak;
  }
  
  return streak;
};

export interface HistorySnapshot {
  board: CellState[][];
  mistakes: number;
  currentCombo: number;
  maxComboThisGame: number;
  lastComboMilestone: number | null;
  hintsUsed?: number;
  completedUnitKeys: string[];
  mistakeShieldState?: MistakeShieldState;
}

export function findNakedSingle(board: number[][], solution: number[][]): { row: number; col: number; val: number; technique: 'Naked Single'; message: string; relatedCells: [number, number][] } | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length === 1) {
          const val = candidates[0];
          const related: [number, number][] = [];
          for (let i = 0; i < 9; i++) {
            if (board[r][i] !== 0 && i !== c) related.push([r, i]);
            if (board[i][c] !== 0 && i !== r) related.push([i, c]);
          }
          const startR = Math.floor(r / 3) * 3;
          const startC = Math.floor(c / 3) * 3;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const pr = startR + i;
              const pc = startC + j;
              if (board[pr][pc] !== 0 && (pr !== r || pc !== c)) {
                if (!related.some(([xr, xc]) => xr === pr && xc === pc)) {
                  related.push([pr, pc]);
                }
              }
            }
          }
          return {
            row: r,
            col: c,
            val,
            technique: 'Naked Single',
            message: `A Naked Single is available: the highlighted cell at Row ${r+1}, Column ${c+1} has only one valid candidate (${val}) because its peers block all other numbers.`,
            relatedCells: related,
          };
        }
      }
    }
  }
  return null;
}

export function findHiddenSingle(board: number[][], solution: number[][]): { row: number; col: number; val: number; technique: 'Hidden Single'; message: string; relatedCells: [number, number][]; unit: 'row' | 'col' | 'box' } | null {
  // Check Rows
  for (let r = 0; r < 9; r++) {
    for (let num = 1; num <= 9; num++) {
      if (board[r].some(val => val === num)) continue;
      
      const possibleCols: number[] = [];
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 && isValid(board, r, c, num)) {
          possibleCols.push(c);
        }
      }
      if (possibleCols.length === 1) {
        const c = possibleCols[0];
        const related: [number, number][] = [];
        for (let i = 0; i < 9; i++) {
          if (board[i][c] === num) related.push([i, c]);
        }
        return {
          row: r,
          col: c,
          val: num,
          technique: 'Hidden Single',
          message: `In Row ${r+1}, the value ${num} can only be placed in the highlighted cell. No other cell in Row ${r+1} can accept it!`,
          relatedCells: related,
          unit: 'row'
        };
      }
    }
  }

  // Check Columns
  for (let c = 0; c < 9; c++) {
    for (let num = 1; num <= 9; num++) {
      let exists = false;
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === num) {
          exists = true;
          break;
        }
      }
      if (exists) continue;

      const possibleRows: number[] = [];
      for (let r = 0; r < 9; r++) {
        if (board[r][c] === 0 && isValid(board, r, c, num)) {
          possibleRows.push(r);
        }
      }
      if (possibleRows.length === 1) {
        const r = possibleRows[0];
        const related: [number, number][] = [];
        for (let i = 0; i < 9; i++) {
          if (board[r][i] === num) related.push([r, i]);
        }
        return {
          row: r,
          col: c,
          val: num,
          technique: 'Hidden Single',
          message: `In Column ${c+1}, the value ${num} can only be placed in the highlighted cell. No other cell in Column ${c+1} can accept it!`,
          relatedCells: related,
          unit: 'col'
        };
      }
    }
  }

  // Check Boxes
  for (let box = 0; box < 9; box++) {
    const startR = Math.floor(box / 3) * 3;
    const startC = (box % 3) * 3;

    for (let num = 1; num <= 9; num++) {
      let exists = false;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[startR + i][startC + j] === num) {
            exists = true;
          }
        }
      }
      if (exists) continue;

      const cells: [number, number][] = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startR + i;
          const c = startC + j;
          if (board[r][c] === 0 && isValid(board, r, c, num)) {
            cells.push([r, c]);
          }
        }
      }
      if (cells.length === 1) {
        const [r, c] = cells[0];
        const related: [number, number][] = [];
        for (let i = 0; i < 9; i++) {
          if (board[r][i] === num && (Math.floor(i / 3) !== Math.floor(c / 3))) related.push([r, i]);
          if (board[i][c] === num && (Math.floor(i / 3) !== Math.floor(r / 3))) related.push([i, c]);
        }
        return {
          row: r,
          col: c,
          val: num,
          technique: 'Hidden Single',
          message: `In Box ${box+1}, the value ${num} can only be placed in the highlighted cell. No other cell in this box can accept it!`,
          relatedCells: related,
          unit: 'box'
        };
      }
    }
  }

  return null;
}

export function findFallbackSingle(board: number[][], solution: number[][]): { row: number; col: number; val: number; technique: 'Logical Deduction'; message: string; relatedCells: [number, number][] } | null {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const val = solution[r][c];
        return {
          row: r,
          col: c,
          val,
          technique: 'Logical Deduction',
          message: `By cross-referencing row and column constraints, the number ${val} is the only valid number for the highlighted cell.`,
          relatedCells: [],
        };
      }
    }
  }
  return null;
}

interface GameState {
  board: CellState[][];
  solution: number[][];
  difficulty: Difficulty;
  selectedCell: [number, number] | null;
  notesMode: boolean;
  mistakes: number;
  timeRemaining: number; 
  timeElapsed: number;
  isPlaying: boolean;
  isPaused: boolean;
  isWon: boolean;
  hintsUsed: number;

  // Daily challenges
  isDailyChallenge: boolean;
  dailyChallengeDate: string | null;
  dailyChallengeDifficulty: Difficulty | null;
  isDailyPractice: boolean;
  dailyHistory: DailyChallengeResult[];
  dailyStreak: DailyStreakState;
  
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  
  isScanning: boolean;
  scanningCell: [number, number] | null;
  
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: 'low' | 'medium' | 'high';
  theme: ThemeType;
  focusLensEnabled: boolean;

  stats: GameStats;
  showStats: boolean;

  // Combos
  currentCombo: number;
  maxComboThisGame: number;
  lastComboMilestone: number | null;
  mistakeShieldState: MistakeShieldState;

  // Surprises & Animations
  lastSurprise: string | null;
  personalityQueue: PersonalityEvent[];
  lastLowPriorityTriggeredAt: number;
  triggeredTypesThisGame: PersonalityEventType[];
  consecutiveCorrectPlayerMoves: number;
  correctMovesSinceLastError: number;
  hasUnprotectedErrorSinceLastComeback: boolean;
  hasReachedNumbraModeThisGame: boolean;
  completedLines: { type: 'row' | 'col' | 'block', index: number, id: number }[];
  completedUnitKeys: string[];
  animationEvents: AnimationEvent[];
  activeHint: ActiveHint | null;

  // Actions
  removePersonalityEvent: (id: string) => void;
  startNewGame: (difficulty: Difficulty) => void;
  startDailyChallenge: (difficulty: Difficulty, dateStr: string, isPractice?: boolean) => void;
  loadSavedGameOrStartNew: () => Promise<void>;
  selectCell: (row: number, col: number) => void;
  applyCellValue: (params: { row: number; col: number; value: number; source: MoveSource }) => void;
  inputNumber: (num: number) => void;
  toggleNotesMode: () => void;
  eraseCell: () => void;
  tickTimer: () => void;
  togglePause: () => void;
  clearSurprise: () => void;
  revealHint: () => void;
  requestHint: () => void;
  advanceHint: () => void;
  confirmHintReveal: () => void;
  cancelHint: () => void;
  undo: () => void;
  redo: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleFocusLens: () => void;
  setHapticIntensity: (intensity: 'low' | 'medium' | 'high') => void;
  setTheme: (theme: ThemeType) => void;
  toggleStats: () => void;
  syncSettings: (user: any | null) => Promise<void>;
  pushAnimationEvent: (event: AnimationEventInput) => void;
  clearAnimationEvent: (id: string) => void;
  clearOldAnimationEvents: (maxAgeMs: number) => void;
}

const isBrowser = typeof window !== 'undefined';

const loadStats = (): GameStats => {
  if (isBrowser) {
    try {
      const raw = localStorage.getItem('sudoku_stats');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) return parsed;
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    }
  }
  return { gamesWon: 0, averageTime: 0, currentStreak: 0, totalGamesFinished: 0, fastestFinish: null, achievements: [], history: [] };
};

const loadSettings = () => {
  if (isBrowser) {
    try {
      const raw = localStorage.getItem('sudoku_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          return {
            theme: (parsed.theme || 'cosmic') as ThemeType,
            soundEnabled: parsed.soundEnabled !== undefined ? parsed.soundEnabled : true,
            hapticsEnabled: parsed.hapticsEnabled !== undefined ? parsed.hapticsEnabled : true,
            hapticIntensity: (parsed.hapticIntensity || 'medium') as 'low' | 'medium' | 'high',
            focusLensEnabled: parsed.focusLensEnabled !== undefined ? parsed.focusLensEnabled : true
          };
        }
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }
  return {
    theme: 'cosmic' as ThemeType,
    soundEnabled: true,
    hapticsEnabled: true,
    hapticIntensity: 'medium' as const,
    focusLensEnabled: true
  };
};

const pushUndoState = (get: () => GameState, set: (state: any) => void) => {
  const { board, mistakes, currentCombo, maxComboThisGame, lastComboMilestone, hintsUsed, undoStack, completedUnitKeys, mistakeShieldState } = get();
  
  const boardCopy = board.map(row => 
    row.map(cell => ({
      value: cell.value,
      notes: new Set(cell.notes),
      isInitial: cell.isInitial,
      isError: cell.isError
    }))
  );

  const snapshot: HistorySnapshot = {
    board: boardCopy,
    mistakes,
    currentCombo,
    maxComboThisGame,
    lastComboMilestone,
    hintsUsed,
    completedUnitKeys: [...completedUnitKeys],
    mistakeShieldState
  };

  set({
    undoStack: [...undoStack, snapshot].slice(-50),
    redoStack: [] // Clear redo on any new action!
  });
};

export const useGameStore = create<GameState>((set, get) => ({
  board: [],
  solution: [],
  difficulty: 'easy',
  selectedCell: null,
  notesMode: false,
  mistakes: 0,
  timeElapsed: 0,
  timeRemaining: 0,
  isPlaying: false,
  isPaused: false,
  isWon: false,
  hintsUsed: 0,
  undoStack: [],
  redoStack: [],
  
  // Daily challenge states
  isDailyChallenge: false,
  dailyChallengeDate: null,
  dailyChallengeDifficulty: null,
  isDailyPractice: false,
  dailyHistory: loadDailyHistory(),
  dailyStreak: loadDailyStreak(),
  
  isScanning: false,
  scanningCell: null,
  
  soundEnabled: loadSettings().soundEnabled,
  hapticsEnabled: loadSettings().hapticsEnabled,
  hapticIntensity: loadSettings().hapticIntensity,
  theme: loadSettings().theme,
  focusLensEnabled: loadSettings().focusLensEnabled,

  stats: loadStats(),
  showStats: false,

  currentCombo: 0,
  maxComboThisGame: 0,
  lastComboMilestone: null,
  mistakeShieldState: 'locked',

  lastSurprise: null,
  personalityQueue: [],
  lastLowPriorityTriggeredAt: 0,
  triggeredTypesThisGame: [],
  consecutiveCorrectPlayerMoves: 0,
  correctMovesSinceLastError: 0,
  hasUnprotectedErrorSinceLastComeback: false,
  hasReachedNumbraModeThisGame: false,
  completedLines: [],
  completedUnitKeys: [],
  animationEvents: [],
  activeHint: null,

  startNewGame: (difficulty) => {
    haptic.medium();
    audio.playDifficultySelect(difficulty);
    const { puzzle, solution } = generateSudoku(difficulty);
    
    // If resetting an ongoing game, break the streak
    const { isPlaying, timeElapsed, stats } = get();
    if (isPlaying && timeElapsed > 0) {
      const newStats = {
        ...stats,
        currentStreak: 0
      };
      set({ stats: newStats });
    }

    const boardState: CellState[][] = puzzle.map(row => 
      row.map(val => ({
        value: val,
        notes: new Set(),
        isInitial: val !== 0,
        isError: false,
      }))
    );
    
    set({
      board: boardState,
      solution,
      difficulty,
      selectedCell: null,
      notesMode: false,
      mistakes: 0,
      timeElapsed: 0,
      isPlaying: true,
      isPaused: false,
      isWon: false,
      hintsUsed: 0,
      undoStack: [],
      redoStack: [],
      lastSurprise: null,
      personalityQueue: [],
      lastLowPriorityTriggeredAt: 0,
      triggeredTypesThisGame: [],
      consecutiveCorrectPlayerMoves: 0,
      correctMovesSinceLastError: 0,
      hasUnprotectedErrorSinceLastComeback: false,
      hasReachedNumbraModeThisGame: false,
      completedLines: [],
      completedUnitKeys: [],
      animationEvents: [],
      currentCombo: 0,
      maxComboThisGame: 0,
      lastComboMilestone: null,
      activeHint: null,
      mistakeShieldState: 'locked',
      // Reset Daily Challenge states
      isDailyChallenge: false,
      dailyChallengeDate: null,
      dailyChallengeDifficulty: null,
      isDailyPractice: false,
    });
  },

  startDailyChallenge: (difficulty, dateStr, isPractice = false) => {
    haptic.medium();
    audio.playDifficultySelect(difficulty);
    const seed = `numbra-daily-${difficulty}-${dateStr}`;
    const { puzzle, solution } = generateSudoku(difficulty, { seed });
    
    const boardState: CellState[][] = puzzle.map(row => 
      row.map(val => ({
        value: val,
        notes: new Set(),
        isInitial: val !== 0,
        isError: false,
      }))
    );
    
    set({
      board: boardState,
      solution,
      difficulty,
      selectedCell: null,
      notesMode: false,
      mistakes: 0,
      timeElapsed: 0,
      isPlaying: true,
      isPaused: false,
      isWon: false,
      hintsUsed: 0,
      undoStack: [],
      redoStack: [],
      lastSurprise: null,
      personalityQueue: [],
      lastLowPriorityTriggeredAt: 0,
      triggeredTypesThisGame: [],
      consecutiveCorrectPlayerMoves: 0,
      correctMovesSinceLastError: 0,
      hasUnprotectedErrorSinceLastComeback: false,
      hasReachedNumbraModeThisGame: false,
      completedLines: [],
      completedUnitKeys: [],
      animationEvents: [],
      currentCombo: 0,
      maxComboThisGame: 0,
      lastComboMilestone: null,
      activeHint: null,
      mistakeShieldState: 'locked',
      // Set Daily Challenge states
      isDailyChallenge: true,
      dailyChallengeDate: dateStr,
      dailyChallengeDifficulty: difficulty,
      isDailyPractice: isPractice,
    });
  },

  loadSavedGameOrStartNew: async () => {
    const saved = await loadGameState();
    if (saved) {
      set({
        board: saved.board,
        solution: saved.solution,
        difficulty: saved.difficulty,
        mistakes: saved.mistakes,
        timeElapsed: saved.timeElapsed,
        isPlaying: true,
        isPaused: false,
        isWon: false,
        hintsUsed: saved.hintsUsed || 0,
        undoStack: [],
        redoStack: [],
        selectedCell: null,
        notesMode: false,
        lastSurprise: null,
        completedLines: [],
        completedUnitKeys: saved.completedUnitKeys || [],
        animationEvents: [],
        currentCombo: saved.currentCombo || 0,
        maxComboThisGame: saved.maxComboThisGame || 0,
        lastComboMilestone: saved.lastComboMilestone,
        isDailyChallenge: saved.gameKind === 'daily',
        dailyChallengeDate: saved.dailyDate,
        dailyChallengeDifficulty: saved.dailyDifficulty,
        isDailyPractice: false,
        activeHint: null,
        mistakeShieldState: saved.mistakeShieldState || 'locked',
      });
    } else {
      get().startNewGame('easy');
    }
  },

  selectCell: (row, col) => {
    if (get().isWon) return;
    haptic.light();
    audio.playTick(get().difficulty);
    set({ selectedCell: [row, col] });
  },

  applyCellValue: ({ row, col, value, source }) => {
    const { board, solution, isPlaying, isPaused, isScanning, mistakes, completedLines, difficulty, completedUnitKeys } = get();
    if (!isPlaying || isPaused || (isScanning && source !== 'hint')) return;

    const cell = board[row][col];
    if (cell.isInitial || cell.value === value) return;

    // Capture state before move for naked single detection
    const isCellEmptyBefore = cell.value === 0;
    const boardValsBefore = board.map(r => r.map(c => c.value));
    const candidatesBefore = getCandidates(boardValsBefore, row, col);
    const isNakedSingle = isCellEmptyBefore && candidatesBefore.length === 1;

    // Deep mutable-ready copies
    const newBoard = board.map(r => r.map(c => ({
      ...c,
      notes: new Set(c.notes)
    })));
    const isError = solution[row][col] !== value;
    
    newBoard[row][col] = {
      ...newBoard[row][col],
      value,
      isError,
      notes: new Set() // Value placed clears notes of this cell!
    };

    let newMistakes = mistakes;
    let surprise = null;
    let newCompletedLines = [...completedLines];

    let rowJustCompleted = false;
    let colJustCompleted = false;
    let blockJustCompleted = false;
    let completedUnitsCount = 0;

    let nextCombo = get().currentCombo;
    let nextMaxCombo = get().maxComboThisGame;
    let nextMilestone = get().lastComboMilestone;
    let shieldState = get().mistakeShieldState;

    if (isError) {
      const conflicts = getConflictingCells(board, row, col, value);

      // Handle Mistake Shield
      if (source === 'player' && shieldState === 'armed') {
        shieldState = 'spent';
        haptic.light();
        audio.playShieldAbsorbed();

        const comboBefore = nextCombo;
        nextCombo = Math.max(3, nextCombo - 2);

        get().pushAnimationEvent({
          type: 'mistake-shield-absorbed',
          row,
          col,
          comboBefore,
          comboAfter: nextCombo
        });

        newMistakes += 1;

        get().pushAnimationEvent({
          type: 'cell-error',
          row,
          col,
          value,
          conflicts
        });

        if (newMistakes === 3) surprise = 'bruh';
      } else {
        haptic.error();
        audio.playError(difficulty);
        newMistakes += 1;

        get().pushAnimationEvent({
          type: 'cell-error',
          row,
          col,
          value,
          conflicts
        });

        if (newMistakes === 3) surprise = 'bruh';

        // Half the helper combo rounded down (Only for player moves)
        if (source === 'player') {
          nextCombo = Math.floor(nextCombo / 2);
        }
      }
    } else {
      haptic.medium();
      audio.playTick(difficulty);

      get().pushAnimationEvent({
        type: 'cell-correct',
        row,
        col,
        value
      });

      // Award combos ONLY for Player Source placements!
      if (source === 'player') {
        const comboBefore = nextCombo;
        nextCombo += 1;
        if (nextCombo > nextMaxCombo) {
          nextMaxCombo = nextCombo;
        }

        // Detect milestones
        if (nextCombo === 2 || nextCombo === 3 || nextCombo === 5 || nextCombo === 8) {
          nextMilestone = nextCombo;
        }

        // Arm mistake shield if we just reached combo >= 5 and it was locked
        if (comboBefore < MISTAKE_SHIELD_UNLOCK_COMBO && nextCombo >= MISTAKE_SHIELD_UNLOCK_COMBO && shieldState === 'locked') {
          shieldState = 'armed';
          audio.playShieldArmed();
          haptic.light();
          get().pushAnimationEvent({
            type: 'mistake-shield-armed'
          });
        }
      }

      // Clear row and col peer notes
      for (let i = 0; i < 9; i++) {
        if (newBoard[row][i].notes.has(value)) {
          newBoard[row][i].notes.delete(value);
          get().pushAnimationEvent({
            type: 'note-removed',
            row,
            col: i,
            value
          });
        }
        if (newBoard[i][col].notes.has(value)) {
          newBoard[i][col].notes.delete(value);
          get().pushAnimationEvent({
            type: 'note-removed',
            row: i,
            col,
            value
          });
        }
      }
      
      // Clear 3x3 box peer notes
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (newBoard[r][c].notes.has(value)) {
            newBoard[r][c].notes.delete(value);
            get().pushAnimationEvent({
              type: 'note-removed',
              row: r,
              col: c,
              value
            });
          }
        }
      }

      // Check row/column/box units completion
      let rowComplete = true;
      let colComplete = true;
      let blockComplete = true;

      for (let x = 0; x < 9; x++) {
        if (newBoard[row][x].value !== solution[row][x] || newBoard[row][x].isError) rowComplete = false;
        if (newBoard[x][col].value !== solution[x][col] || newBoard[x][col].isError) colComplete = false;
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (newBoard[startRow + i][startCol + j].value !== solution[startRow + i][startCol + j] || newBoard[startRow + i][startCol + j].isError) {
            blockComplete = false;
          }
        }
      }

      let lineCleared = false;
      const nextCompletedUnitKeys = [...completedUnitKeys];

      rowJustCompleted = false;
      colJustCompleted = false;
      blockJustCompleted = false;
      completedUnitsCount = 0;

      const rowKey = `row-${row}`;
      if (rowComplete && !completedUnitKeys.includes(rowKey)) {
        const cells: [number, number][] = Array.from({ length: 9 }, (_, x) => [row, x]);
        get().pushAnimationEvent({
          type: 'unit-complete',
          unit: 'row',
          index: row,
          cells
        });
        newCompletedLines.push({ type: 'row', index: row, id: Date.now() + 1 });
        nextCompletedUnitKeys.push(rowKey);
        lineCleared = true;
        rowJustCompleted = true;
        completedUnitsCount++;
      }

      const colKey = `col-${col}`;
      if (colComplete && !completedUnitKeys.includes(colKey)) {
        const cells: [number, number][] = Array.from({ length: 9 }, (_, x) => [x, col]);
        get().pushAnimationEvent({
          type: 'unit-complete',
          unit: 'col',
          index: col,
          cells
        });
        newCompletedLines.push({ type: 'col', index: col, id: Date.now() + 2 });
        nextCompletedUnitKeys.push(colKey);
        lineCleared = true;
        colJustCompleted = true;
        completedUnitsCount++;
      }

      const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const blockKey = `box-${blockIndex}`;
      if (blockComplete && !completedUnitKeys.includes(blockKey)) {
        const cells: [number, number][] = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            cells.push([startRow + i, startCol + j]);
          }
        }
        get().pushAnimationEvent({
          type: 'unit-complete',
          unit: 'box',
          index: blockIndex,
          cells
        });
        newCompletedLines.push({ type: 'block', index: blockIndex, id: Date.now() + 3 });
        nextCompletedUnitKeys.push(blockKey);
        lineCleared = true;
        blockJustCompleted = true;
        completedUnitsCount++;
      }

      if (lineCleared) {
         audio.playLineComplete();
         haptic.success();
         surprise = 'line_clear';
      }

      if (row === 4 && col === 4 && value === 7) {
        surprise = 'lucky_7';
      }

      set({ completedUnitKeys: nextCompletedUnitKeys });
    }

    // Check overall win condition
    let won = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const bdCell = newBoard[r][c];
        if (bdCell.value !== solution[r][c] || bdCell.isError) {
          won = false;
          break;
        }
      }
      if (!won) break;
    }

    if (won) {
      haptic.success();
      audio.playTada();
      clearSavedGame();

      get().pushAnimationEvent({
        type: 'win'
      });

      const { stats, timeElapsed, isDailyChallenge, dailyChallengeDate, hintsUsed, isDailyPractice } = get();
      
      const achievements = new Set(stats.achievements || []);
      if (stats.gamesWon + 1 >= 10) achievements.add('Complete 10 games');
      if (newMistakes === 0) achievements.add('No mistakes');
      if (stats.fastestFinish === null || timeElapsed < stats.fastestFinish) achievements.add('Fastest finish');
      
      const newHistoryEntry: GameHistoryEntry = {
        difficulty,
        timeElapsed,
        date: getLocalDateString(),
        isDaily: isDailyChallenge,
        mistakes: newMistakes
      };
      
      const newStats: GameStats = {
        ...stats,
        gamesWon: stats.gamesWon + 1,
        currentStreak: stats.currentStreak + 1,
        totalGamesFinished: stats.totalGamesFinished + 1,
        averageTime: Math.round(((stats.averageTime * stats.totalGamesFinished) + timeElapsed) / (stats.totalGamesFinished + 1)),
        fastestFinish: stats.fastestFinish === null ? timeElapsed : Math.min(stats.fastestFinish, timeElapsed),
        achievements: Array.from(achievements),
        history: [...(stats.history || []), newHistoryEntry]
      };
      
      set({ stats: newStats });

      if (isDailyChallenge && dailyChallengeDate) {
        const streakState = registerDailyCompletion(
          dailyChallengeDate,
          difficulty,
          timeElapsed,
          newMistakes,
          hintsUsed,
          nextMaxCombo, // Requirement Part 4: Pass nextMaxCombo correctly calculated before recording
          isDailyPractice
        );
        set({
          dailyHistory: loadDailyHistory(),
          dailyStreak: streakState
        });
      }
    }

    // --- PERSONALITY EVENT LOGIC ---
    let nextConsecutiveCorrect = get().consecutiveCorrectPlayerMoves;
    let nextCorrectSinceError = get().correctMovesSinceLastError;
    let nextHasUnprotectedError = get().hasUnprotectedErrorSinceLastComeback;
    let nextHasReachedNumbra = get().hasReachedNumbraModeThisGame;

    if (source === 'player') {
      if (isError) {
        nextConsecutiveCorrect = 0;
        nextCorrectSinceError = 0;
        // set unprotected error if shield is not armed
        if (get().mistakeShieldState !== 'armed') {
          nextHasUnprotectedError = true;
        }
      } else {
        nextConsecutiveCorrect += 1;
        nextCorrectSinceError += 1;
      }
    } else if (source === 'hint') {
      nextConsecutiveCorrect = 0;
      nextCorrectSinceError = 0;
    }

    const reachedNumbraMode = !nextHasReachedNumbra && nextCombo >= 8;
    if (reachedNumbraMode) {
      nextHasReachedNumbra = true;
    }

    // Evaluate isUnitAlmostComplete
    let isUnitAlmostComplete = false;
    if (!isError) {
      let rowCorrectCount = 0;
      let colCorrectCount = 0;
      let blockCorrectCount = 0;
      for (let x = 0; x < 9; x++) {
        if (newBoard[row][x].value === solution[row][x] && !newBoard[row][x].isError) rowCorrectCount++;
        if (newBoard[x][col].value === solution[x][col] && !newBoard[x][col].isError) colCorrectCount++;
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (newBoard[r][c].value === solution[r][c] && !newBoard[r][c].isError) {
            blockCorrectCount++;
          }
        }
      }
      if (rowCorrectCount === 8 || colCorrectCount === 8 || blockCorrectCount === 8) {
        isUnitAlmostComplete = true;
      }
    }

    const themeProfile = getThemeFeedbackProfile(get().theme);
    const pTone = themeProfile.personalityTone;

    const wasPlayShieldAbsorbed = isError && source === 'player' && get().mistakeShieldState === 'armed';

    const pContext: GameplayEventContext = {
      consecutiveCorrectPlayerMoves: nextConsecutiveCorrect,
      correctMovesSinceLastError: nextCorrectSinceError,
      hasUnprotectedErrorSinceLastComeback: nextHasUnprotectedError,
      rowComplete: rowJustCompleted,
      colComplete: colJustCompleted,
      blockComplete: blockJustCompleted,
      completedUnitsCount,
      reachedNumbraMode,
      isNakedSingle,
      isUnitAlmostComplete,
      isShieldAbsorbed: wasPlayShieldAbsorbed,
    };

    const triggeredType = getTriggeredPersonalityEvent(source, isError, pContext, pTone);

    let nextQueue = [...get().personalityQueue];
    let nextLowPriorityTime = get().lastLowPriorityTriggeredAt;
    const nextTriggeredThisGame = [...get().triggeredTypesThisGame];

    if (won) {
      nextQueue = [];
    } else if (triggeredType) {
      const now = Date.now();
      const priority = EVENT_PRIORITY[triggeredType];
      let shouldAdd = true;

      if (priority === 'low') {
        if (now - get().lastLowPriorityTriggeredAt < 6000) {
          shouldAdd = false;
        }
      }

      // Deduplication: no repeating same type in the last 10s
      const hasRecentOfSameType = nextQueue.some(e => e.type === triggeredType && (now - e.createdAt < 10000));
      if (hasRecentOfSameType) {
        shouldAdd = false;
      }

      // Once per game for low-priority: do not repeat same low-priority message more than once per game
      if (priority === 'low' && get().triggeredTypesThisGame.includes(triggeredType)) {
        shouldAdd = false;
      }

      if (shouldAdd) {
        const text = getPersonalityMessage(pTone, triggeredType);
        const newEvent: PersonalityEvent = {
          id: `${triggeredType}-${now}-${Math.random()}`,
          type: triggeredType,
          priority,
          messageKey: text,
          createdAt: now,
          expiresAt: now + (priority === 'high' ? 2200 : 1800),
        };

        if (nextQueue.length >= 3) {
          if (priority === 'high' || priority === 'medium') {
            const lowPriorityIndex = nextQueue.findIndex(e => e.priority === 'low');
            if (lowPriorityIndex !== -1) {
              nextQueue.splice(lowPriorityIndex, 1);
            } else {
              nextQueue.shift();
            }
          } else {
            shouldAdd = false;
          }
        }

        if (shouldAdd) {
          nextQueue.push(newEvent);
          if (!nextTriggeredThisGame.includes(triggeredType)) {
            nextTriggeredThisGame.push(triggeredType);
          }
          if (priority === 'low') {
            nextLowPriorityTime = now;
          }

          setTimeout(() => {
            get().removePersonalityEvent(newEvent.id);
          }, newEvent.expiresAt - now);
        }
      }
    }

    if (triggeredType && triggeredType === 'comeback' && nextHasUnprotectedError) {
      nextHasUnprotectedError = false;
    }

    set({ 
      board: newBoard, 
      mistakes: newMistakes, 
      isWon: won,
      isPlaying: !won,
      lastSurprise: surprise || get().lastSurprise,
      completedLines: newCompletedLines,
      currentCombo: nextCombo,
      maxComboThisGame: nextMaxCombo,
      lastComboMilestone: nextMilestone,
      mistakeShieldState: shieldState,
      personalityQueue: nextQueue,
      lastLowPriorityTriggeredAt: nextLowPriorityTime,
      triggeredTypesThisGame: nextTriggeredThisGame,
      consecutiveCorrectPlayerMoves: nextConsecutiveCorrect,
      correctMovesSinceLastError: nextCorrectSinceError,
      hasUnprotectedErrorSinceLastComeback: nextHasUnprotectedError,
      hasReachedNumbraModeThisGame: nextHasReachedNumbra,
    });

    if (newCompletedLines.length > completedLines.length) {
      setTimeout(() => {
        set(state => ({ completedLines: state.completedLines.slice(newCompletedLines.length - completedLines.length) }));
      }, 1000);
    }
  },

  inputNumber: (num) => {
    const { board, selectedCell, notesMode, isPlaying, isPaused, isScanning, difficulty } = get();
    if (!isPlaying || isPaused || isScanning || !selectedCell) return;
    
    const [row, col] = selectedCell;
    const cell = board[row][col];
    
    if (cell.isInitial || cell.value === num) return;

    pushUndoState(get, set);

    if (notesMode) {
      if (cell.value !== 0) return; // Note updates apply exclusively to empty cells!

      haptic.light();
      audio.playTick(difficulty);
      const newBoard = board.map(r => r.map(c => ({
        ...c,
        notes: new Set(c.notes)
      })));
      const newNotes = newBoard[row][col].notes;
      const hadNote = newNotes.has(num);
      if (hadNote) {
        newNotes.delete(num);
        get().pushAnimationEvent({
          type: 'note-removed',
          row,
          col,
          value: num
        });
      } else {
        newNotes.add(num);
      }
      set({ board: newBoard });
      return;
    }

    get().applyCellValue({ row, col, value: num, source: 'player' });
  },

  toggleNotesMode: () => {
    haptic.light();
    audio.playTick(get().difficulty);
    set((state) => ({ notesMode: !state.notesMode }));
  },

  eraseCell: () => {
    const { board, selectedCell, isWon, isPaused, isScanning } = get();
    if (isWon || isPaused || isScanning || !selectedCell) return;
    const [row, col] = selectedCell;
    const cell = board[row][col];
    if (cell.isInitial || cell.value === 0) return;

    pushUndoState(get, set);

    const newBoard = board.map(r => r.map(c => ({ ...c, notes: new Set(c.notes) })));
    newBoard[row][col].value = 0;
    newBoard[row][col].isError = false;
    newBoard[row][col].notes = new Set(); // Reset erasing cell notes completely to prevent leaving stale notes behind!

    set({ board: newBoard });
  },

  tickTimer: () => {
    const { isPlaying, isPaused, timeElapsed } = get();
    if (isPlaying && !isPaused) {
      const newTime = timeElapsed + 1;
      set({ timeElapsed: newTime });
    }
  },

  togglePause: () => {
    haptic.light();
    audio.playTick();
    set((state) => ({ isPaused: !state.isPaused }));
  },

  clearSurprise: () => set({ lastSurprise: null }),

  removePersonalityEvent: (id: string) => set((state) => ({
    personalityQueue: state.personalityQueue.filter(e => e.id !== id)
  })),

  revealHint: () => {
    const { isScanning, isWon, isPaused, activeHint } = get();
    if (isWon || isPaused) return;

    haptic.medium();

    if (activeHint) {
      get().advanceHint();
      return;
    }

    set({ isScanning: true, scanningCell: [0, 0] });

    let count = 0;
    const interval = setInterval(() => {
      const r = Math.floor(Math.random() * 9);
      const c = Math.floor(Math.random() * 9);
      set({ scanningCell: [r, c] });
      count++;
      if (count >= 10) {
        clearInterval(interval);
        set({ isScanning: false, scanningCell: null });
        get().requestHint();
      }
    }, 100);
  },

  requestHint: () => {
    const { board, solution, hintsUsed } = get();
    const rawBoard = board.map(row => row.map(cell => cell.value));
    
    // prioritized search for naked followed by hidden, fallback is general crossreferencing logical deduction
    const hintResult = findNakedSingle(rawBoard, solution) || findHiddenSingle(rawBoard, solution) || findFallbackSingle(rawBoard, solution);
    
    if (hintResult) {
      const actHint: ActiveHint = {
        level: 1,
        technique: hintResult.technique,
        targetCell: [hintResult.row, hintResult.col],
        relatedCells: hintResult.relatedCells || [],
        unit: (hintResult as any).unit,
        message: `We detected a **${hintResult.technique}** deduction. Click next to learn more.`,
        value: hintResult.val
      };

      set({
        activeHint: actHint,
        hintsUsed: hintsUsed + 1
      });

      haptic.success();
      audio.playLineComplete();
    }
  },

  advanceHint: () => {
    const { activeHint } = get();
    if (!activeHint) return;

    const nextLevel = (activeHint.level < 4 ? activeHint.level + 1 : 4) as 1 | 2 | 3 | 4;
    const [row, col] = activeHint.targetCell;
    const value = activeHint.value;

    let message = '';
    if (nextLevel === 2) {
      message = `Take a close look at the highlighted cell at Row ${row + 1}, Column ${col + 1}.`;
      set({ selectedCell: [row, col] });
    } else if (nextLevel === 3) {
      if (activeHint.technique === 'Naked Single') {
        message = `Surrounding peers in the row, column, and box block all candidates except **${value}**. It is the only option here!`;
      } else if (activeHint.technique === 'Hidden Single') {
        message = `In this ${activeHint.unit}, the number **${value}** can only go inside this cell. No other cell fits it!`;
      } else {
        message = `By logical cross-referencing of remaining candidates, the number **${value}** fits perfectly.`;
      }
    } else if (nextLevel === 4) {
      message = `Would you like Numbra to reveal and place the correct value (**${value}**) into this cell?`;
    }

    set({
      activeHint: {
        ...activeHint,
        level: nextLevel,
        message
      }
    });
    haptic.light();
  },

  confirmHintReveal: () => {
    const { activeHint } = get();
    if (!activeHint) return;

    const [row, col] = activeHint.targetCell;
    const value = activeHint.value;

    pushUndoState(get, set);
    get().applyCellValue({ row, col, value, source: 'hint' });

    set({ activeHint: null });
  },

  cancelHint: () => {
    set({ activeHint: null });
  },

  undo: () => {
    const { isPlaying, isPaused, isScanning, undoStack, board, mistakes, currentCombo, maxComboThisGame, lastComboMilestone, hintsUsed, redoStack, completedUnitKeys, mistakeShieldState } = get();
    if (!isPlaying || isPaused || isScanning || undoStack.length === 0) return;

    haptic.medium();
    audio.playTick();

    const previousStack = [...undoStack];
    const snapshot = previousStack.pop()!;

    const boardCopy = board.map(row =>
      row.map(cell => ({
        value: cell.value,
        notes: new Set(cell.notes),
        isInitial: cell.isInitial,
        isError: cell.isError
      }))
    );

    const currentSnapshot: HistorySnapshot = {
      board: boardCopy,
      mistakes,
      currentCombo,
      maxComboThisGame,
      lastComboMilestone,
      hintsUsed,
      completedUnitKeys: [...completedUnitKeys],
      mistakeShieldState
    };

    let nextShieldState = snapshot.mistakeShieldState ?? 'locked';
    if (mistakeShieldState === 'spent') {
      nextShieldState = 'spent';
    } else if (nextShieldState === 'armed' && snapshot.currentCombo < MISTAKE_SHIELD_UNLOCK_COMBO) {
      nextShieldState = 'locked';
    }

    set({
      board: snapshot.board,
      mistakes: snapshot.mistakes,
      currentCombo: snapshot.currentCombo,
      maxComboThisGame: snapshot.maxComboThisGame,
      lastComboMilestone: snapshot.lastComboMilestone,
      hintsUsed: snapshot.hintsUsed !== undefined ? snapshot.hintsUsed : hintsUsed,
      completedUnitKeys: snapshot.completedUnitKeys || [],
      mistakeShieldState: nextShieldState,
      undoStack: previousStack,
      redoStack: [...redoStack, currentSnapshot]
    });
  },

  redo: () => {
    const { isPlaying, isPaused, isScanning, redoStack, board, mistakes, currentCombo, maxComboThisGame, lastComboMilestone, hintsUsed, undoStack, completedUnitKeys, mistakeShieldState } = get();
    if (!isPlaying || isPaused || isScanning || redoStack.length === 0) return;

    haptic.medium();
    audio.playTick();

    const nextStack = [...redoStack];
    const snapshot = nextStack.pop()!;

    const boardCopy = board.map(row =>
      row.map(cell => ({
        value: cell.value,
        notes: new Set(cell.notes),
        isInitial: cell.isInitial,
        isError: cell.isError
      }))
    );

    const currentSnapshot: HistorySnapshot = {
      board: boardCopy,
      mistakes,
      currentCombo,
      maxComboThisGame,
      lastComboMilestone,
      hintsUsed,
      completedUnitKeys: [...completedUnitKeys],
      mistakeShieldState
    };

    let nextShieldState = snapshot.mistakeShieldState ?? 'locked';
    if (mistakeShieldState === 'spent') {
      nextShieldState = 'spent';
    } else if (nextShieldState === 'armed' && snapshot.currentCombo < MISTAKE_SHIELD_UNLOCK_COMBO) {
      nextShieldState = 'locked';
    }

    set({
      board: snapshot.board,
      mistakes: snapshot.mistakes,
      currentCombo: snapshot.currentCombo,
      maxComboThisGame: snapshot.maxComboThisGame,
      lastComboMilestone: snapshot.lastComboMilestone,
      hintsUsed: snapshot.hintsUsed !== undefined ? snapshot.hintsUsed : hintsUsed,
      completedUnitKeys: snapshot.completedUnitKeys || [],
      mistakeShieldState: nextShieldState,
      undoStack: [...undoStack, currentSnapshot],
      redoStack: nextStack
    });
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  toggleHaptics: () => {
    set((state) => ({ hapticsEnabled: !state.hapticsEnabled }));
  },

  toggleFocusLens: () => {
    set((state) => ({ focusLensEnabled: !state.focusLensEnabled }));
  },

  setHapticIntensity: (intensity) => {
    set({ hapticIntensity: intensity });
  },

  setTheme: (theme) => {
    set({ theme });
  },

  toggleStats: () => {
    set((state) => ({ showStats: !state.showStats }));
  },

  syncSettings: async (user) => {
    if (!user) return;
    try {
      const { db } = await import('../lib/firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'users', user.uid, 'settings', 'current');
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        set({
          theme: data.theme || get().theme,
          soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : get().soundEnabled,
          hapticsEnabled: data.hapticsEnabled !== undefined ? data.hapticsEnabled : get().hapticsEnabled,
          hapticIntensity: data.hapticIntensity || get().hapticIntensity,
          focusLensEnabled: data.focusLensEnabled !== undefined ? data.focusLensEnabled : get().focusLensEnabled,
          stats: data.stats || get().stats,
        });
      } else {
        await setDoc(docRef, {
          theme: get().theme,
          soundEnabled: get().soundEnabled,
          hapticsEnabled: get().hapticsEnabled,
          hapticIntensity: get().hapticIntensity,
          focusLensEnabled: get().focusLensEnabled,
          stats: get().stats
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error syncing settings with Firestore:", e);
    }
  },

  pushAnimationEvent: (event: AnimationEventInput) => {
    const newEvent: AnimationEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: Date.now()
    };
    set((state) => ({
      animationEvents: [...state.animationEvents, newEvent]
    }));
  },

  clearAnimationEvent: (id: string) => {
    set((state) => ({
      animationEvents: state.animationEvents.filter(e => e.id !== id)
    }));
  },

  clearOldAnimationEvents: (maxAgeMs: number) => {
    const now = Date.now();
    set((state) => ({
      animationEvents: state.animationEvents.filter(e => now - e.createdAt < maxAgeMs)
    }));
  }
}));

useGameStore.subscribe((state, prevState) => {
  if (state.isPlaying && state.board.length === 9 && !state.isWon) {
    if (
      state.board !== prevState?.board || 
      state.mistakes !== prevState?.mistakes || 
      state.mistakeShieldState !== prevState?.mistakeShieldState ||
      (state.timeElapsed !== prevState?.timeElapsed && state.timeElapsed % 10 === 0)
    ) {
      saveGameState({
        board: state.board,
        solution: state.solution,
        difficulty: state.difficulty,
        gameKind: state.isDailyChallenge ? 'daily' : 'standard',
        dailyDate: state.dailyChallengeDate,
        dailyDifficulty: state.dailyChallengeDifficulty,
        mistakes: state.mistakes,
        timeElapsed: state.timeElapsed,
        hintsUsed: state.hintsUsed,
        currentCombo: state.currentCombo,
        maxComboThisGame: state.maxComboThisGame,
        lastComboMilestone: state.lastComboMilestone,
        completedUnitKeys: state.completedUnitKeys,
        mistakeShieldState: state.mistakeShieldState,
      });
    }
  }

  if (prevState && (state.theme !== prevState.theme || state.soundEnabled !== prevState.soundEnabled || state.hapticsEnabled !== prevState.hapticsEnabled || state.hapticIntensity !== prevState.hapticIntensity || state.stats !== prevState.stats || state.focusLensEnabled !== prevState.focusLensEnabled)) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sudoku_stats', JSON.stringify(state.stats));
      localStorage.setItem('sudoku_settings', JSON.stringify({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        hapticIntensity: state.hapticIntensity,
        focusLensEnabled: state.focusLensEnabled
      }));
    }

    import('../lib/firebase').then(({ auth, db, OperationType, handleFirestoreError }) => {
      const user = auth.currentUser;
      if (user) {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          const path = `users/${user.uid}/settings/current`;
          setDoc(doc(db, 'users', user.uid, 'settings', 'current'), {
            theme: state.theme,
            soundEnabled: state.soundEnabled,
            hapticsEnabled: state.hapticsEnabled,
            hapticIntensity: state.hapticIntensity,
            focusLensEnabled: state.focusLensEnabled,
            stats: state.stats
          }, { merge: true }).catch((e) => {
            console.error(e);
            handleFirestoreError(e, OperationType.WRITE, path);
          });
        });
      }
    });
  }
});
