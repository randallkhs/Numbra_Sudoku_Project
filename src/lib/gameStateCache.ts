import { CellState } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';

export interface SavedGameState {
  board: CellState[][];
  solution: number[][];
  difficulty: Difficulty;
  mistakes: number;
  timeElapsed: number;
}

const LOCAL_GAME_STORAGE_KEY = 'sudoku_saved_game';

export const saveGameState = (state: SavedGameState) => {
  if (typeof window !== 'undefined') {
    // Only save if we actually have a board and it's not won yet
    if (state.board.length === 9) {
      const stateToSave = {
        ...state,
        board: state.board.map(row => row.map(cell => ({ ...cell, notes: Array.from(cell.notes) })))
      };
      localStorage.setItem(LOCAL_GAME_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }
};

export const loadGameState = (): SavedGameState | null => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(LOCAL_GAME_STORAGE_KEY);
      if (saved) {
        // Need to parse stringified sets for notes if they were saved as simple array/objects
        const parsed = JSON.parse(saved);
        if (parsed.board && parsed.board.length === 9) {
          // Re-hydrate Sets
          parsed.board = parsed.board.map((row: any) => 
            row.map((cell: any) => ({
              ...cell,
              notes: new Set(cell.notes ? (Array.isArray(cell.notes) ? cell.notes : Object.keys(cell.notes).length ? Object.values(cell.notes) : []) : [])
            }))
          );
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load saved game:", e);
    }
  }
  return null;
};

export const clearSavedGame = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(LOCAL_GAME_STORAGE_KEY);
    }
}
