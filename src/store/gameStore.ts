import { create } from 'zustand';
import { generateSudoku, Difficulty } from '../lib/sudoku';
import { haptic } from '../lib/haptics';
import { audio } from '../lib/audio';
import { loadSnarks, saveSnark, getRandomSnark } from '../lib/aiCache';
import { saveGameState, loadGameState, clearSavedGame } from '../lib/gameStateCache';


export type ThemeType = 'cosmic' | 'cyber' | 'paper' | 'neon' | 'glitch' | 'disco' | 'mechanic' | 'cartoon';

export interface GameStats {
  gamesWon: number;
  averageTime: number;
  currentStreak: number;
  totalGamesFinished: number;
}

export type CellState = {
  value: number; // 0 means empty
  notes: Set<number>;
  isInitial: boolean;
  isError: boolean;
};

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
  
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  aiEnabled: boolean;
  theme: ThemeType;

  stats: GameStats;
  showStats: boolean;

  // Surprises & Animations
  lastSurprise: string | null;
  completedLines: { type: 'row' | 'col' | 'block', index: number, id: number }[];

  // Actions
  startNewGame: (difficulty: Difficulty) => void;
  loadSavedGameOrStartNew: () => void;
  selectCell: (row: number, col: number) => void;
  inputNumber: (num: number) => void;
  toggleNotesMode: () => void;
  eraseCell: () => void;
  tickTimer: () => void;
  togglePause: () => void;
  clearSurprise: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  toggleAI: () => void;
  setTheme: (theme: ThemeType) => void;
  toggleStats: () => void;
}

const loadStats = (): GameStats => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('sudoku_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
  }
  return { gamesWon: 0, averageTime: 0, currentStreak: 0, totalGamesFinished: 0 };
};

const saveStats = (stats: GameStats) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sudoku_stats', JSON.stringify(stats));
  }
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
  
  soundEnabled: true,
  hapticsEnabled: true,
  aiEnabled: true,
  theme: 'cosmic',

  stats: loadStats(),
  showStats: false,

  lastSurprise: null,
  completedLines: [],

  startNewGame: (difficulty) => {
    haptic.medium();
    audio.playDifficultySelect(difficulty);
    const { puzzle, solution } = generateSudoku(difficulty);
    
    // If resetting an ongoing game, break the streak
    const { isPlaying, mistakes, timeElapsed, stats } = get();
    if (isPlaying && timeElapsed > 0) {
      const newStats = {
        ...stats,
        currentStreak: 0
      };
      saveStats(newStats);
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
      lastSurprise: null,
      completedLines: [],
    });
  },

  loadSavedGameOrStartNew: () => {
    const saved = loadGameState();
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
        selectedCell: null,
        notesMode: false,
        lastSurprise: null,
        completedLines: []
      });
    } else {
      get().startNewGame('easy');
    }
  },

  selectCell: (row, col) => {
    haptic.light(get().difficulty);
    audio.playTick(get().difficulty);
    set({ selectedCell: [row, col] });
  },

  inputNumber: (num) => {
    const { board, solution, selectedCell, notesMode, isPlaying, isPaused, mistakes, completedLines, difficulty } = get();
    if (!isPlaying || isPaused || !selectedCell) return;
    
    const [row, col] = selectedCell;
    const cell = board[row][col];
    
    if (cell.isInitial || cell.value === num) return;

    if (notesMode) {
      haptic.light(difficulty);
      audio.playTick(difficulty);
      const newBoard = [...board.map(r => [...r])];
      const newNotes = new Set(newBoard[row][col].notes);
      if (newNotes.has(num)) newNotes.delete(num);
      else newNotes.add(num);
      newBoard[row][col].notes = newNotes;
      set({ board: newBoard });
      return;
    }

    // Normal input
    const newBoard = [...board.map(r => [...r])];
    const isError = solution[row][col] !== num;
    
    newBoard[row][col] = {
      ...newBoard[row][col],
      value: num,
      isError,
    };

    let newMistakes = mistakes;
    let surprise = null;
    let newCompletedLines = [...completedLines];

    if (isError) {
      haptic.error(); // no difficulty parameter needed
      audio.playError(difficulty);
      newMistakes += 1;
      
      if (newMistakes === 3) surprise = 'bruh';
      
      if (get().aiEnabled) {
        const snarks = loadSnarks();
        // Use cache: if we have more than 3, have a 60% chance to skip API to save tokens/quota
        const useLocal = snarks.length > 3 && Math.random() < 0.6;

        if (useLocal) {
          const text = getRandomSnark();
          if (text) {
             useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
          }
        } else {
          // Make a side-effect call for AI comment without blocking
          fetch('/api/ai/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: "El jugador acaba de poner un número incorrecto.", context: { difficulty, theme: get().theme } })
          })
          .then(res => res.json())
          .then(data => {
            if (data.text) {
              saveSnark(data.text);
              useGameStore.setState({ lastSurprise: `ai_snark:${data.text}` });
            } else if (data.error && snarks.length > 0) {
              const text = getRandomSnark();
              if (text) useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
            }
          })
          .catch((err) => {
            console.log(err);
            const text = getRandomSnark();
            if (text) useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
          });
        }
      }
      
    } else {
      haptic.medium(difficulty);
      audio.playTick(difficulty);
      // Clear notes from same row, col, block
      for (let i = 0; i < 9; i++) {
        newBoard[row][i].notes.delete(num);
        newBoard[i][col].notes.delete(num);
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          newBoard[startRow + i][startCol + j].notes.delete(num);
        }
      }

      // Check line completions
      let rowComplete = true;
      let colComplete = true;
      let blockComplete = true;

      for(let x=0; x<9; x++) {
        if(newBoard[row][x].value !== solution[row][x] || newBoard[row][x].isError) rowComplete = false;
        if(newBoard[x][col].value !== solution[x][col] || newBoard[x][col].isError) colComplete = false;
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (newBoard[startRow + i][startCol + j].value !== solution[startRow + i][startCol + j] || newBoard[startRow + i][startCol + j].isError) {
            blockComplete = false;
          }
        }
      }

      let lineCleared = false;
      if(rowComplete) { newCompletedLines.push({ type: 'row', index: row, id: Date.now() + 1 }); lineCleared = true; }
      if(colComplete) { newCompletedLines.push({ type: 'col', index: col, id: Date.now() + 2 }); lineCleared = true; }
      const blockIndex = Math.floor(row/3)*3 + Math.floor(col/3);
      if(blockComplete) { newCompletedLines.push({ type: 'block', index: blockIndex, id: Date.now() + 3 }); lineCleared = true; }

      if (lineCleared) {
         audio.playLineComplete();
         haptic.success();
         surprise = 'line_clear';
      }

      // Check center cell 7
      if (row === 4 && col === 4 && num === 7) {
        surprise = 'lucky_7';
      }
    }

    // Check win condition
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
      clearSavedGame(); // game over, remove saved state

      const { stats, timeElapsed } = get();
      const newStats = {
        ...stats,
        gamesWon: stats.gamesWon + 1,
        currentStreak: stats.currentStreak + 1,
        totalGamesFinished: stats.totalGamesFinished + 1,
        averageTime: Math.round(((stats.averageTime * stats.totalGamesFinished) + timeElapsed) / (stats.totalGamesFinished + 1))
      };
      saveStats(newStats);
      set({ stats: newStats });
    }

    set({ 
      board: newBoard, 
      mistakes: newMistakes, 
      isWon: won,
      isPlaying: !won,
      lastSurprise: surprise || get().lastSurprise,
      completedLines: newCompletedLines 
    });

    if (newCompletedLines.length > completedLines.length) {
      setTimeout(() => {
        set(state => ({ completedLines: state.completedLines.slice(newCompletedLines.length - completedLines.length) }));
      }, 1000);
    }
    
    if (!won) {
        saveGameState({
            board: newBoard,
            solution,
            difficulty,
            mistakes: newMistakes,
            timeElapsed: get().timeElapsed
        });
    }
  },

  toggleNotesMode: () => {
    haptic.light(get().difficulty);
    audio.playTick(get().difficulty);
    set((state) => ({ notesMode: !state.notesMode }));
  },

  eraseCell: () => {
    const { board, selectedCell, isPlaying, isPaused, difficulty } = get();
    if (!isPlaying || isPaused || !selectedCell) return;
    
    const [row, col] = selectedCell;
    const cell = board[row][col];
    
    if (cell.isInitial) {
      haptic.error();
      audio.playError(difficulty);
      return;
    }

    haptic.heavy(difficulty);
    audio.playTick(difficulty);
    const newBoard = [...board.map(r => [...r])];
    newBoard[row][col] = {
      ...cell,
      value: 0,
      isError: false,
    };
    
    set({ board: newBoard });
    saveGameState({
        board: newBoard,
        solution: get().solution,
        difficulty,
        mistakes: get().mistakes,
        timeElapsed: get().timeElapsed
    });
  },

  tickTimer: () => {
    const { isPlaying, isPaused, timeElapsed, board, solution, difficulty, mistakes } = get();
    if (isPlaying && !isPaused) {
      const newTime = timeElapsed + 1;
      set({ timeElapsed: newTime });
      
      // Auto-save every 10 seconds to keep time roughly accurate
      if (newTime % 10 === 0 && board.length === 9) {
          saveGameState({ board, solution, difficulty, mistakes, timeElapsed: newTime });
      }
    }
  },

  togglePause: () => {
    haptic.light();
    audio.playTick();
    set((state) => ({ isPaused: !state.isPaused }));
  },

  clearSurprise: () => set({ lastSurprise: null }),

  toggleSound: () => {
    set((state) => {
      const next = !state.soundEnabled;
      audio.enabled = next;
      if (next) audio.init();
      return { soundEnabled: next };
    });
  },

  toggleHaptics: () => {
    set((state) => {
      const next = !state.hapticsEnabled;
      haptic.enabled = next;
      if (next) haptic.light();
      return { hapticsEnabled: next };
    });
  },

  toggleAI: () => {
    haptic.light();
    audio.playTick();
    set((state) => ({ aiEnabled: !state.aiEnabled }));
  },

  toggleStats: () => {
    haptic.light();
    audio.playTick();
    set((state) => ({ showStats: !state.showStats }));
  },

  setTheme: (theme) => {
    haptic.light();
    audio.playTick();
    audio.theme = theme;
    set({ theme });
  }
}));
