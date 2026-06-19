import { CellState } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from './firebase';

export interface SavedGameState {
  board: CellState[][];
  solution: number[][];
  difficulty: Difficulty;
  mistakes: number;
  timeElapsed: number;
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
      isInitial: cell.isInitial,
      isError: cell.isError,
      notes: new Set(cell.notes ? (Array.isArray(cell.notes) ? cell.notes : Object.keys(cell.notes).length ? Object.values(cell.notes) : []) : [])
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

export const saveGameState = async (state: SavedGameState) => {
  if (typeof window !== 'undefined') {
    // Only save if we actually have a board and it's not won yet
    if (state.board.length === 9) {
      const stateToSave = {
        difficulty: state.difficulty,
        mistakes: state.mistakes,
        timeElapsed: state.timeElapsed,
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
          console.error(e);
        }
      }
    }

    if (parsed) {
      // Re-hydrate Sets and structure
      if (parsed.board && Array.isArray(parsed.board)) {
        if (parsed.board.length > 0 && Array.isArray(parsed.board[0])) {
          // Legacy 2D array representation
          parsed.board = parsed.board.map((row: any) => 
            row.map((cell: any) => ({
              ...cell,
              notes: new Set(cell.notes ? (Array.isArray(cell.notes) ? cell.notes : Object.keys(cell.notes).length ? Object.values(cell.notes) : []) : [])
            }))
          );
        } else {
          // Flattened representation
          parsed.board = unflattenBoard(parsed.board);
        }
      }
      
      if (parsed.solution && Array.isArray(parsed.solution)) {
        if (parsed.solution.length > 0 && Array.isArray(parsed.solution[0])) {
          // Legacy 2D representation
        } else {
          // Flattened representation
          parsed.solution = unflattenSolution(parsed.solution);
        }
      }

      if (parsed.board && parsed.board.length === 9) {
        return parsed as SavedGameState;
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
}

