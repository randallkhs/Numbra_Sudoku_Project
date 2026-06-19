import { create } from 'zustand';
import { generateSudoku, Difficulty, getConflictingCells } from '../lib/sudoku';
import { haptic } from '../lib/haptics';
import { audio } from '../lib/audio';
import { saveGameState, loadGameState, clearSavedGame } from '../lib/gameStateCache';


export type ThemeType = 'cosmic' | 'cyber' | 'paper' | 'neon' | 'glitch' | 'disco' | 'mechanic' | 'cartoon';

export type AnimationEventInput =
  | { type: 'cell-correct'; row: number; col: number; value: number }
  | { type: 'cell-error'; row: number; col: number; value: number; conflicts?: [number, number][] }
  | { type: 'unit-complete'; unit: 'row' | 'col' | 'box'; index: number; cells: [number, number][] }
  | { type: 'note-removed'; row: number; col: number; value: number }
  | { type: 'win' };

export type AnimationEvent = AnimationEventInput & { id: string; createdAt: number };

export interface GameStats {
  gamesWon: number;
  averageTime: number;
  currentStreak: number;
  totalGamesFinished: number;
  fastestFinish: number | null;
  achievements: string[];
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
  hintsUsed: number;
  
  isScanning: boolean;
  scanningCell: [number, number] | null;
  
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  hapticIntensity: 'low' | 'medium' | 'high';
  theme: ThemeType;

  stats: GameStats;

  showStats: boolean;

  // Combos
  currentCombo: number;
  maxComboThisGame: number;
  lastComboMilestone: number | null;

  // Surprises & Animations
  lastSurprise: string | null;
  completedLines: { type: 'row' | 'col' | 'block', index: number, id: number }[];
  animationEvents: AnimationEvent[];

  // Actions
  startNewGame: (difficulty: Difficulty) => void;
  loadSavedGameOrStartNew: () => Promise<void>;
  selectCell: (row: number, col: number) => void;
  inputNumber: (num: number) => void;
  toggleNotesMode: () => void;
  eraseCell: () => void;
  tickTimer: () => void;
  togglePause: () => void;
  clearSurprise: () => void;
  revealHint: () => void;
  toggleSound: () => void;
  toggleHaptics: () => void;
  setHapticIntensity: (intensity: 'low' | 'medium' | 'high') => void;
  setTheme: (theme: ThemeType) => void;
  toggleStats: () => void;
  syncSettings: (user: any | null) => Promise<void>;
  pushAnimationEvent: (event: AnimationEventInput) => void;
  clearAnimationEvent: (id: string) => void;
  clearOldAnimationEvents: (maxAgeMs: number) => void;
}

const loadStats = (): GameStats => {
  return { gamesWon: 0, averageTime: 0, currentStreak: 0, totalGamesFinished: 0, fastestFinish: null, achievements: [] };
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
  
  isScanning: false,
  scanningCell: null,
  
  soundEnabled: true,
  hapticsEnabled: true,
  hapticIntensity: 'medium',
  theme: 'cosmic',

  stats: loadStats(),
  showStats: false,

  currentCombo: 0,
  maxComboThisGame: 0,
  lastComboMilestone: null,

  lastSurprise: null,
  completedLines: [],
  animationEvents: [],

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
      lastSurprise: null,
      completedLines: [],
      animationEvents: [],
      currentCombo: 0,
      maxComboThisGame: 0,
      lastComboMilestone: null,
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
        hintsUsed: (saved as any).hintsUsed || 0,
        selectedCell: null,
        notesMode: false,
        lastSurprise: null,
        completedLines: [],
        animationEvents: [],
        currentCombo: 0,
        maxComboThisGame: 0,
        lastComboMilestone: null,
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

  inputNumber: (num) => {
    const { board, solution, selectedCell, notesMode, isPlaying, isPaused, isScanning, mistakes, completedLines, difficulty } = get();
    if (!isPlaying || isPaused || isScanning || !selectedCell) return;
    
    const [row, col] = selectedCell;
    const cell = board[row][col];
    
    if (cell.isInitial || cell.value === num) return;

    if (notesMode) {
      haptic.light();
      audio.playTick(difficulty);
      const newBoard = [...board.map(r => [...r])];
      const newNotes = new Set(newBoard[row][col].notes);
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
      newBoard[row][col] = { ...newBoard[row][col], notes: newNotes };
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

    let nextCombo = get().currentCombo;
    let nextMaxCombo = get().maxComboThisGame;
    let nextMilestone = get().lastComboMilestone;

    if (isError) {
      haptic.error(); // no difficulty parameter needed
      audio.playError(difficulty);
      newMistakes += 1;

      const conflicts = getConflictingCells(board, row, col, num);

      get().pushAnimationEvent({
        type: 'cell-error',
        row,
        col,
        value: num,
        conflicts
      });
      
      if (newMistakes === 3) surprise = 'bruh';

      // LESS PUNISHING option: half the combo (rounded down) instead of a complete reset to 0
      nextCombo = Math.floor(nextCombo / 2);
    } else {
      haptic.medium();
      audio.playTick(difficulty);

      get().pushAnimationEvent({
        type: 'cell-correct',
        row,
        col,
        value: num
      });

      nextCombo += 1;
      if (nextCombo > nextMaxCombo) {
        nextMaxCombo = nextCombo;
      }

      // Detect milestone entries
      if (nextCombo === 2 || nextCombo === 3 || nextCombo === 5 || nextCombo === 8) {
        nextMilestone = nextCombo;
      }

      // Clear notes from same row, col, block immutably and push note-removed events where necessary
      for (let i = 0; i < 9; i++) {
        if (newBoard[row][i].notes.has(num)) {
          newBoard[row][i] = { ...newBoard[row][i], notes: new Set(newBoard[row][i].notes) };
          newBoard[row][i].notes.delete(num);
          get().pushAnimationEvent({
            type: 'note-removed',
            row,
            col: i,
            value: num
          });
        }
        if (newBoard[i][col].notes.has(num)) {
          newBoard[i][col] = { ...newBoard[i][col], notes: new Set(newBoard[i][col].notes) };
          newBoard[i][col].notes.delete(num);
          get().pushAnimationEvent({
            type: 'note-removed',
            row: i,
            col,
            value: num
          });
        }
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const r = startRow + i;
          const c = startCol + j;
          if (newBoard[r][c].notes.has(num)) {
            newBoard[r][c] = { ...newBoard[r][c], notes: new Set(newBoard[r][c].notes) };
            newBoard[r][c].notes.delete(num);
            get().pushAnimationEvent({
              type: 'note-removed',
              row: r,
              col: c,
              value: num
            });
          }
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
      if (rowComplete) {
        const cells: [number, number][] = Array.from({ length: 9 }, (_, x) => [row, x]);
        get().pushAnimationEvent({
          type: 'unit-complete',
          unit: 'row',
          index: row,
          cells
        });
        newCompletedLines.push({ type: 'row', index: row, id: Date.now() + 1 });
        lineCleared = true;
      }
      if (colComplete) {
        const cells: [number, number][] = Array.from({ length: 9 }, (_, x) => [x, col]);
        get().pushAnimationEvent({
          type: 'unit-complete',
          unit: 'col',
          index: col,
          cells
        });
        newCompletedLines.push({ type: 'col', index: col, id: Date.now() + 2 });
        lineCleared = true;
      }
      const blockIndex = Math.floor(row/3)*3 + Math.floor(col/3);
      if (blockComplete) {
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
        lineCleared = true;
      }

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

      get().pushAnimationEvent({
        type: 'win'
      });

      const { stats, timeElapsed, mistakes } = get();
      
      const achievements = new Set(stats.achievements || []);
      if (stats.gamesWon + 1 >= 10) achievements.add('Complete 10 games');
      if (mistakes === 0) achievements.add('No mistakes');
      if (stats.fastestFinish === null || timeElapsed < stats.fastestFinish) achievements.add('Fastest finish');
      
      const newStats = {
        ...stats,
        gamesWon: stats.gamesWon + 1,
        currentStreak: stats.currentStreak + 1,
        totalGamesFinished: stats.totalGamesFinished + 1,
        averageTime: Math.round(((stats.averageTime * stats.totalGamesFinished) + timeElapsed) / (stats.totalGamesFinished + 1)),
        fastestFinish: stats.fastestFinish === null ? timeElapsed : Math.min(stats.fastestFinish, timeElapsed),
        achievements: Array.from(achievements)
      };
      
      set({ stats: newStats });
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
      lastComboMilestone: nextMilestone
    });

    if (newCompletedLines.length > completedLines.length) {
      setTimeout(() => {
        set(state => ({ completedLines: state.completedLines.slice(newCompletedLines.length - completedLines.length) }));
      }, 1000);
    }
    
    if (!won) {
      // Auto-save is handled by state subscription
    }
  },

  toggleNotesMode: () => {
    haptic.light();
    audio.playTick(get().difficulty);
    set((state) => ({ notesMode: !state.notesMode }));
  },

  eraseCell: () => {
    const { board, selectedCell, isPlaying, isPaused, isScanning, difficulty } = get();
    if (!isPlaying || isPaused || isScanning || !selectedCell) return;
    
    const [row, col] = selectedCell;
    const cell = board[row][col];
    
    if (cell.isInitial) {
      haptic.error();
      audio.playError(difficulty);
      return;
    }

    haptic.heavy();
    audio.playTick(difficulty);
    const newBoard = [...board.map(r => [...r])];
    newBoard[row][col] = {
      ...cell,
      value: 0,
      isError: false,
    };
    
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

  revealHint: () => {
    const { board, solution, isPlaying, isPaused, isScanning, difficulty, selectedCell } = get();
    if (!isPlaying || isPaused || isScanning) return;

    let target: [number, number] | null = null;
    
    if (selectedCell) {
      const [r, c] = selectedCell;
      const cell = board[r][c];
      if (!cell.isInitial && cell.value !== solution[r][c]) {
        target = [r, c];
      }
    }

    if (!target) {
      // Find all empty or incorrect cells
      const candidates: [number, number][] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          const bdCell = board[r][c];
          if (!bdCell.isInitial && bdCell.value !== solution[r][c]) {
            candidates.push([r, c]);
          }
        }
      }

      if (candidates.length === 0) return;

      // Pick a random candidate
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const [targetR, targetC] = target;

    set((state) => ({ 
      isScanning: true,
      hintsUsed: state.hintsUsed + 1
    }));
    
    let scanCount = 0;
    const maxScans = 15;
    
    haptic.heavy();
    
    const scanInterval = setInterval(() => {
      audio.playTick(difficulty);
      // Pick random cell for visual scan effect
      const randomR = Math.floor(Math.random() * 9);
      const randomC = Math.floor(Math.random() * 9);
      set({ scanningCell: [randomR, randomC] });
      
      scanCount++;
      if (scanCount >= maxScans) {
        clearInterval(scanInterval);
        
        const wasNotesMode = get().notesMode;
        if (wasNotesMode) set({ notesMode: false });
        
        set({ scanningCell: null });
        get().selectCell(targetR, targetC);
        
        setTimeout(() => {
           // Re-select the cell to avoid race conditions if the user tapped elsewhere
           get().selectCell(targetR, targetC);
           get().inputNumber(solution[targetR][targetC]);
           set({ isScanning: false });
           
           if (wasNotesMode) set({ notesMode: true });
        }, 150);
      }
    }, 80);
  },

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

  setHapticIntensity: (intensity: 'low' | 'medium' | 'high') => {
    set({ hapticIntensity: intensity });
    haptic.intensity = intensity;
    // Maybe trigger a sample haptic feedback?
    if (get().hapticsEnabled) {
       import('../lib/haptics').then(({ haptic }) => {
          haptic.medium(); // Just a test buzz
       });
    }
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
  },

  syncSettings: async (user) => {
    if (user) {
      // Import dynamically to avoid circular dependencies if any
      const { doc, getDoc } = await import('firebase/firestore');
      const { db, OperationType, handleFirestoreError } = await import('../lib/firebase');
      const path = `users/${user.uid}/settings/current`;
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const s = docSnap.data();
          set({
            theme: s.theme || 'cosmic',
            soundEnabled: s.soundEnabled ?? true,
            hapticsEnabled: s.hapticsEnabled ?? true,
            hapticIntensity: s.hapticIntensity || 'medium',
            stats: s.stats || { gamesWon: 0, averageTime: 0, currentStreak: 0, totalGamesFinished: 0, fastestFinish: null, achievements: [] }
          });
          audio.enabled = s.soundEnabled ?? true;
          haptic.enabled = s.hapticsEnabled ?? true;
          haptic.intensity = s.hapticIntensity || 'medium';
          audio.theme = s.theme || 'cosmic';
          return;
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
        handleFirestoreError(e, OperationType.GET, path);
      }
    } 
    
    // Fallback to local storage
    if (typeof window !== 'undefined') {
      try {
        const localStatsRaw = localStorage.getItem('sudoku_stats');
        const localSettingsRaw = localStorage.getItem('sudoku_settings');
        
        let stats = { gamesWon: 0, averageTime: 0, currentStreak: 0, totalGamesFinished: 0, fastestFinish: null, achievements: [] };
        if (localStatsRaw) stats = JSON.parse(localStatsRaw);
        
        let s: any = {};
        if (localSettingsRaw) s = JSON.parse(localSettingsRaw);
        
        set({ 
          theme: s.theme || 'cosmic', 
          soundEnabled: s.soundEnabled ?? true, 
          hapticsEnabled: s.hapticsEnabled ?? true, 
          hapticIntensity: s.hapticIntensity || 'medium',
          stats: stats
        });
        audio.enabled = s.soundEnabled ?? true;
        haptic.enabled = s.hapticsEnabled ?? true;
        haptic.intensity = s.hapticIntensity || 'medium';
        audio.theme = s.theme || 'cosmic';
      } catch (e) {
        console.error("Failed to load local settings:", e);
      }
    }
  },

  pushAnimationEvent: (event: AnimationEventInput) => {
    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
    const createdAt = Date.now();
    const newEvent = { ...event, id, createdAt } as AnimationEvent;
    set((state) => ({
      animationEvents: [...state.animationEvents, newEvent]
    }));
  },

  clearAnimationEvent: (id) => {
    set((state) => {
      const remaining = state.animationEvents.filter(e => e.id !== id);
      if (remaining.length === state.animationEvents.length) {
        return {};
      }
      return { animationEvents: remaining };
    });
  },

  clearOldAnimationEvents: (maxAgeMs) => {
    const cutoff = Date.now() - maxAgeMs;
    set((state) => {
      const remaining = state.animationEvents.filter(e => e.createdAt >= cutoff);
      if (remaining.length === state.animationEvents.length) {
        return {};
      }
      return { animationEvents: remaining };
    });
  }
}));

useGameStore.subscribe((state, prevState) => {
  if (state.isPlaying && state.board.length === 9 && !state.isWon) {
    // Only save when board/mistakes change or when timeElapsed hits a 10s mark to avoid excessive spam
    if (
      state.board !== prevState?.board || 
      state.mistakes !== prevState?.mistakes || 
      (state.timeElapsed !== prevState?.timeElapsed && state.timeElapsed % 10 === 0)
    ) {
      saveGameState({
        board: state.board,
        solution: state.solution,
        difficulty: state.difficulty,
        mistakes: state.mistakes,
        timeElapsed: state.timeElapsed,
        hintsUsed: state.hintsUsed,
      });
    }
  }

  if (prevState && (state.theme !== prevState.theme || state.soundEnabled !== prevState.soundEnabled || state.hapticsEnabled !== prevState.hapticsEnabled || state.hapticIntensity !== prevState.hapticIntensity || state.stats !== prevState.stats)) {
    // Store locally to support guest play or offline caching
    if (typeof window !== 'undefined') {
      localStorage.setItem('sudoku_stats', JSON.stringify(state.stats));
      localStorage.setItem('sudoku_settings', JSON.stringify({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        hapticIntensity: state.hapticIntensity
      }));
    }

    // dynamically import
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
