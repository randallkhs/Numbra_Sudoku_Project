import { CellState, MistakeShieldState } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';

export interface SavedGameState {
  version: 2;
  board: CellState[][];
  solution: number[][];
  difficulty: Difficulty;
  gameKind: 'standard' | 'daily';
  dailyDate: string | null;
  dailyDifficulty: Difficulty | null;
  mistakes: number;
  timeElapsed: number;
  hintsUsed: number;
  currentCombo: number;
  maxComboThisGame: number;
  lastComboMilestone: number | null;
  completedUnitKeys: string[];
  mistakeShieldState?: MistakeShieldState;
}

const LOCAL_GAME_STORAGE_KEY = 'sudoku_saved_game';

const flattenBoard = (grid: CellState[][]) => {
  const flat: any[] = [];
  grid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      flat.push({
        value: cell.value,
        isInitial: cell.isInitial,
        isError: cell.isError,
        notes: Array.from(cell.notes),
        row: rIdx,
        col: cIdx
      });
    });
  });
  return flat;
};

const unflattenBoard = (flat: any[]): CellState[][] => {
  const grid: CellState[][] = Array.from({ length: 9 }, () => []);
  flat.forEach((cell, idx) => {
    const r = typeof cell.row === 'number' ? cell.row : Math.floor(idx / 9);
    const c = typeof cell.col === 'number' ? cell.col : idx % 9;
    grid[r][c] = {
      value: cell.value,
      isInitial: !!cell.isInitial,
      isError: !!cell.isError,
      notes: new Set(
        cell.notes
          ? Array.isArray(cell.notes)
            ? cell.notes
            : typeof cell.notes === 'object' && cell.notes !== null
            ? Object.values(cell.notes)
            : []
          : []
      )
    };
  });
  return grid;
};

const flattenSolution = (grid: number[][]) => {
  const flat: number[] = [];
  grid.forEach(row => {
    row.forEach(val => {
      flat.push(val);
    });
  });
  return flat;
};

const unflattenSolution = (flat: number[]) => {
  const grid: number[][] = Array.from({ length: 9 }, () => []);
  for (let i = 0; i < 81; i++) {
    const r = Math.floor(i / 9);
    const c = i % 9;
    grid[r][c] = flat[i];
  }
  return grid;
};

export const saveGameState = async (state: Omit<SavedGameState, 'version'>) => {
  if (typeof window !== 'undefined') {
    // Only save if we actually have a board
    if (state.board.length === 9) {
      const stateToSave = {
        version: 2,
        difficulty: state.difficulty,
        gameKind: state.gameKind,
        dailyDate: state.dailyDate,
        dailyDifficulty: state.dailyDifficulty,
        mistakes: state.mistakes,
        timeElapsed: state.timeElapsed,
        hintsUsed: state.hintsUsed ?? 0,
        currentCombo: state.currentCombo ?? 0,
        maxComboThisGame: state.maxComboThisGame ?? 0,
        lastComboMilestone: state.lastComboMilestone ?? null,
        completedUnitKeys: state.completedUnitKeys ?? [],
        mistakeShieldState: state.mistakeShieldState ?? 'locked',
        board: flattenBoard(state.board),
        solution: flattenSolution(state.solution)
      };
      
      const user = auth.currentUser;
      if (user) {
        const path = `users/${user.uid}/gameState/current`;
        try {
          await setDoc(doc(db, 'users', user.uid, 'gameState', 'current'), stateToSave);
        } catch (e) {
          console.error("Failed to save to Firestore", e);
          handleFirestoreError(e, OperationType.WRITE, path);
        }
      } else {
        localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify(stateToSave));
      }
    }
  }
};

export const loadGameState = async (): Promise<SavedGameState | null> => {
  if (typeof window !== 'undefined') {
    let parsed: any = null;
    const user = auth.currentUser;
    if (user) {
      const path = `users/${user.uid}/gameState/current`;
      try {
        const docRef = doc(db, 'users', user.uid, 'gameState', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          parsed = docSnap.data();
        }
      } catch (e) {
        console.error("Failed to load from Firestore", e);
        handleFirestoreError(e, OperationType.GET, path);
      }
    }
    
    if (!parsed) {
      const item = localStorage.getItem(LOCAL_GAME_STORAGE_KEY);
      if (item) {
        try {
          parsed = JSON.parse(item);
        } catch (e) {
          console.error("Failed to parse local saved game data:", e);
        }
      }
    }

    if (parsed) {
      try {
        // Re-hydrate Sets and structure
        let hydratedBoard: CellState[][] = [];
        if (parsed.board && Array.isArray(parsed.board)) {
          if (parsed.board.length > 0 && Array.isArray(parsed.board[0])) {
            // Legacy 2D array representation
            hydratedBoard = parsed.board.map((row: any) => 
              row.map((cell: any) => ({
                value: typeof cell.value === 'number' ? cell.value : 0,
                isInitial: !!cell.isInitial,
                isError: !!cell.isError,
                notes: new Set(
                  cell.notes
                    ? Array.isArray(cell.notes)
                      ? cell.notes
                      : typeof cell.notes === 'object' && cell.notes !== null
                      ? Object.values(cell.notes)
                      : []
                    : []
                )
              }))
            );
          } else {
            // Flattened representation
            hydratedBoard = unflattenBoard(parsed.board);
          }
        }
        
        let hydratedSolution: number[][] = [];
        if (parsed.solution && Array.isArray(parsed.solution)) {
          if (parsed.solution.length > 0 && Array.isArray(parsed.solution[0])) {
            // Legacy 2D representation
            hydratedSolution = parsed.solution;
          } else {
            // Flattened representation
            hydratedSolution = unflattenSolution(parsed.solution);
          }
        }

        if (hydratedBoard.length === 9 && hydratedSolution.length === 9) {
          const gameKind = parsed.gameKind || (parsed.isDailyChallenge ? 'daily' : 'standard');
          
          return {
            version: 2,
            board: hydratedBoard,
            solution: hydratedSolution,
            difficulty: parsed.difficulty || 'easy',
            gameKind,
            dailyDate: parsed.dailyDate || parsed.dailyChallengeDate || null,
            dailyDifficulty: parsed.dailyDifficulty || parsed.dailyChallengeDifficulty || null,
            mistakes: typeof parsed.mistakes === 'number' ? parsed.mistakes : 0,
            timeElapsed: typeof parsed.timeElapsed === 'number' ? parsed.timeElapsed : 0,
            hintsUsed: typeof parsed.hintsUsed === 'number' ? parsed.hintsUsed : 0,
            currentCombo: typeof parsed.currentCombo === 'number' ? parsed.currentCombo : 0,
            maxComboThisGame: typeof parsed.maxComboThisGame === 'number' ? parsed.maxComboThisGame : 0,
            lastComboMilestone: parsed.lastComboMilestone !== undefined ? parsed.lastComboMilestone : null,
            completedUnitKeys: Array.isArray(parsed.completedUnitKeys) ? parsed.completedUnitKeys : [],
            mistakeShieldState: parsed.mistakeShieldState || 'locked',
          };
        }
      } catch (err) {
        console.error("Failed to migrate or rehydrate legacy/V1 data:", err);
        return null;
      }
    }
  }
  return null;
};

export const clearSavedGame = async () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_GAME_STORAGE_KEY);
    const user = auth.currentUser;
    if (user) {
      const path = `users/${user.uid}/gameState/current`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'gameState', 'current'));
      } catch(e) {
        handleFirestoreError(e, OperationType.DELETE, path);
      }
    }
  }
};
