import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { getLegalCandidates } from '../lib/sudoku';

describe('Numbra Sudoku Features', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useGameStore.getState();
    store.startNewGame('easy');
  });

  describe('Mistake Shield', () => {
    // Utility to get a playable coordinate
    const getPlayableCell = () => {
      const state = useGameStore.getState();
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!state.board[r][c].isInitial && state.board[r][c].value === 0) {
            return { row: r, col: c, correctVal: state.solution[r][c] };
          }
        }
      }
      throw new Error("Could not find playable cell for test");
    };

    it('arms the shield when currentCombo reaches 5 via player correct moves', () => {
      const state = useGameStore.getState();
      
      // Ensure it starts locked
      expect(state.mistakeShieldState).toBe('locked');
      
      // Mock correct player moves to raise combo
      useGameStore.setState({ currentCombo: 4 });
      
      // Place a correct move to reach combo 5 on a playable cell
      const { row, col, correctVal } = getPlayableCell();
      state.applyCellValue({ row, col, value: correctVal, source: 'player' });

      const updatedState = useGameStore.getState();
      expect(updatedState.currentCombo).toBe(5);
      expect(updatedState.mistakeShieldState).toBe('armed');
      
      // Check if mistake-shield-armed event was dispatched
      const armedEvent = updatedState.animationEvents.find(e => e.type === 'mistake-shield-armed');
      expect(armedEvent).toBeDefined();
    });

    it('does not arm the shield via hint moves', () => {
      const state = useGameStore.getState();
      expect(state.mistakeShieldState).toBe('locked');
      
      // Mock correct move using 'hint' source
      useGameStore.setState({ currentCombo: 4 });
      
      const { row, col, correctVal } = getPlayableCell();
      state.applyCellValue({ row, col, value: correctVal, source: 'hint' });

      const updatedState = useGameStore.getState();
      expect(updatedState.mistakeShieldState).toBe('locked');
    });

    it('absorbs the first mistake and reduces combo by 2 on player error while armed', () => {
      const state = useGameStore.getState();
      
      // Setup state: armed with combo 6
      useGameStore.setState({
        mistakeShieldState: 'armed',
        currentCombo: 6,
        mistakes: 0
      });

      // Execute an incorrect player move on a playable cell
      const { row, col, correctVal } = getPlayableCell();
      const incorrectVal = correctVal === 9 ? 1 : correctVal + 1;

      state.applyCellValue({ row, col, value: incorrectVal, source: 'player' });

      const updatedState = useGameStore.getState();
      // Shield is consumed
      expect(updatedState.mistakeShieldState).toBe('spent');
      // Mistake still increments normally
      expect(updatedState.mistakes).toBe(1);
      // Combo reduced by 2 (6 -> 4) instead of normal combo loss (half)
      expect(updatedState.currentCombo).toBe(4);

      // Check for mistake-shield-absorbed animation event
      const absorbedEvent = updatedState.animationEvents.find(e => e.type === 'mistake-shield-absorbed');
      expect(absorbedEvent).toBeDefined();
      expect(absorbedEvent?.row).toBe(row);
      expect(absorbedEvent?.col).toBe(col);
      expect((absorbedEvent as any).comboBefore).toBe(6);
      expect((absorbedEvent as any).comboAfter).toBe(4);
    });

    it('minimum retained combo of 3 is enforced when shield absorbs a mistake', () => {
      const state = useGameStore.getState();
      
      // Setup armed shield with combo 4
      useGameStore.setState({
        mistakeShieldState: 'armed',
        currentCombo: 4,
        mistakes: 0
      });

      const { row, col, correctVal } = getPlayableCell();
      const incorrectVal = correctVal === 9 ? 1 : correctVal + 1;

      state.applyCellValue({ row, col, value: incorrectVal, source: 'player' });

      const updatedState = useGameStore.getState();
      expect(updatedState.mistakeShieldState).toBe('spent');
      // 4 - 2 is 2, but min retained combo is 3
      expect(updatedState.currentCombo).toBe(3);
    });

    it('applies regular combo loss to subsequent errors when shield is spent', () => {
      const state = useGameStore.getState();
      
      // Setup state with spent shield and combo 6
      useGameStore.setState({
        mistakeShieldState: 'spent',
        currentCombo: 6,
        mistakes: 1
      });

      const { row, col, correctVal } = getPlayableCell();
      const incorrectVal = correctVal === 9 ? 1 : correctVal + 1;

      state.applyCellValue({ row, col, value: incorrectVal, source: 'player' });

      // Regular play halves/resets combo
      const updatedState = useGameStore.getState();
      expect(updatedState.mistakeShieldState).toBe('spent');
      expect(updatedState.mistakes).toBe(2);
      expect(updatedState.currentCombo).toBe(3); // 6 halved is 3
    });

    it('new game resets shield state to locked', () => {
      const state = useGameStore.getState();
      useGameStore.setState({ mistakeShieldState: 'spent' });
      
      state.startNewGame('easy');
      expect(useGameStore.getState().mistakeShieldState).toBe('locked');
    });
  });

  describe('Focus Lens', () => {
    it('correctly reports exclusions and handles empty grids', () => {
      // Create a test 9x9 grid representation
      const board = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => ({
          value: 0,
          notes: new Set<number>(),
          isInitial: false,
          isError: false
        }))
      );

      // Exclude row values
      board[0][1].value = 2;
      board[0][2].value = 5;

      // Exclude column values
      board[1][0].value = 3;
      board[4][0].value = 8;

      // Exclude box values
      board[1][1].value = 1;
      board[2][2].value = 7;

      const candidates = getLegalCandidates(board, 0, 0);

      // Excluded: 2, 5 (row); 3, 8 (col); 1, 7 (box/shared)
      expect(candidates).not.toContain(1);
      expect(candidates).not.toContain(2);
      expect(candidates).not.toContain(3);
      expect(candidates).not.toContain(5);
      expect(candidates).not.toContain(7);
      expect(candidates).not.toContain(8);

      // Allowed candidates
      expect(candidates).toContain(4);
      expect(candidates).toContain(6);
      expect(candidates).toContain(9);
    });

    it('ignores cells containing error flag during exclude calculation', () => {
      const board = Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => ({
          value: 0,
          notes: new Set<number>(),
          isInitial: false,
          isError: false
        }))
      );

      // Place a conflicting value that is an error
      board[0][1].value = 5;
      board[0][1].isError = true; // Error cell, should be ignored (treated as 0)

      // Expected output should NOT exclude 5 because isError is true
      const candidates = getLegalCandidates(board, 0, 0);
      expect(candidates).toContain(5);
    });
  });
});
