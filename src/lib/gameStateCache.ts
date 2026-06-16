import { CellState } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export interface SavedGameState {
  board: CellState[][];
  solution: number[][];
  difficulty: Difficulty;
  mistakes: number;
  timeElapsed: number;
}

const LOCAL_GAME_STORAGE_KEY = 'sudoku_saved_game';

export const saveGameState = async (state: SavedGameState) => {
  if (typeof window !== 'undefined') {
    // Only save if we actually have a board and it's not won yet
    if (state.board.length === 9) {
      const stateToSave = {
        ...state,
        board: state.board.map(row => row.map(cell => ({ ...cell, notes: Array.from(cell.notes) })))
      };
      
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'gameState', 'current'), stateToSave);
        } catch (e) {
          console.error("Failed to save to Firestore", e);
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
      try {
        const docRef = doc(db, 'users', user.uid, 'gameState', 'current');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          parsed = docSnap.data();
        }
      } catch (e) {
        console.error("Failed to load from Firestore", e);
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

    if (parsed && parsed.board && parsed.board.length === 9) {
      // Re-hydrate Sets
      parsed.board = parsed.board.map((row: any) => 
        row.map((cell: any) => ({
          ...cell,
          notes: new Set(cell.notes ? (Array.isArray(cell.notes) ? cell.notes : Object.keys(cell.notes).length ? Object.values(cell.notes) : []) : [])
        }))
      );
      return parsed as SavedGameState;
    }
  }
  return null;
};

export const clearSavedGame = async () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_GAME_STORAGE_KEY);
        const user = auth.currentUser;
        if (user) {
             try {
                await deleteDoc(doc(db, 'users', user.uid, 'gameState', 'current'));
             } catch(e) {}
        }
    }
}

