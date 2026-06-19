export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function isValid(board: number[][], row: number, col: number, num: number): boolean {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }
  for (let x = 0; x < 9; x++) {
    if (board[x][col] === num) return false;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }
  return true;
}

export function getCandidates(board: number[][], row: number, col: number): number[] {
  const present = new Array(10).fill(false);
  for (let x = 0; x < 9; x++) {
    present[board[row][x]] = true;
    present[board[x][col]] = true;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      present[board[startRow + i][startCol + j]] = true;
    }
  }
  const candidates: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (!present[num]) {
      candidates.push(num);
    }
  }
  return candidates;
}

export function findMRVCell(board: number[][]): { row: number; col: number; candidates: number[] } | null {
  let minCandidates: number[] | null = null;
  let bestRow = -1;
  let bestCol = -1;

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        const candidates = getCandidates(board, r, c);
        if (candidates.length === 0) {
          return { row: r, col: c, candidates: [] };
        }
        if (minCandidates === null || candidates.length < minCandidates.length) {
          minCandidates = candidates;
          bestRow = r;
          bestCol = c;
        }
      }
    }
  }

  if (bestRow === -1) return null;
  return { row: bestRow, col: bestCol, candidates: minCandidates! };
}

export function countSolutions(board: number[][], limit = 2): number {
  const tempBoard = board.map(row => [...row]);
  let solutionCount = 0;

  function backtrack(): boolean {
    if (solutionCount >= limit) {
      return true;
    }

    const mrv = findMRVCell(tempBoard);
    if (mrv === null) {
      solutionCount++;
      return solutionCount >= limit;
    }

    if (mrv.candidates.length === 0) {
      return false;
    }

    for (const num of mrv.candidates) {
      tempBoard[mrv.row][mrv.col] = num;
      const stop = backtrack();
      tempBoard[mrv.row][mrv.col] = 0;
      if (stop) {
        return true;
      }
    }
    return false;
  }

  backtrack();
  return solutionCount;
}

export function solveSudoku(board: number[][]): boolean {
  const mrv = findMRVCell(board);
  if (mrv === null) {
    return true;
  }

  if (mrv.candidates.length === 0) {
    return false;
  }

  for (const num of mrv.candidates) {
    board[mrv.row][mrv.col] = num;
    if (solveSudoku(board)) {
      return true;
    }
    board[mrv.row][mrv.col] = 0;
  }
  return false;
}

export function solveSudokuWithMRVAndShuffle(board: number[][]): boolean {
  const mrv = findMRVCell(board);
  if (mrv === null) {
    return true;
  }

  if (mrv.candidates.length === 0) {
    return false;
  }

  const shuffledCandidates = [...mrv.candidates];
  for (let i = shuffledCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledCandidates[i], shuffledCandidates[j]] = [shuffledCandidates[j], shuffledCandidates[i]];
  }

  for (const num of shuffledCandidates) {
    board[mrv.row][mrv.col] = num;
    if (solveSudokuWithMRVAndShuffle(board)) {
      return true;
    }
    board[mrv.row][mrv.col] = 0;
  }
  return false;
}

export function generateSudoku(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = createEmptyBoard();
  
  const fillDiagonal = () => {
    for (let i = 0; i < 9; i = i + 3) {
      fillBlock(i, i);
    }
  };

  const fillBlock = (rowStart: number, colStart: number) => {
    let num: number;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        do {
          num = Math.floor(Math.random() * 9) + 1;
        } while (!isValidInBlock(solution, rowStart, colStart, num));
        solution[rowStart + i][colStart + j] = num;
      }
    }
  };

  const isValidInBlock = (board: number[][], rowStart: number, colStart: number, num: number) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[rowStart + i][colStart + j] === num) return false;
      }
    }
    return true;
  };

  fillDiagonal();
  solveSudokuWithMRVAndShuffle(solution);

  const puzzle = solution.map(row => [...row]);
  
  let cellsToRemove = 0;
  switch (difficulty) {
    case 'easy': cellsToRemove = 30; break;
    case 'medium': cellsToRemove = 45; break;
    case 'hard': cellsToRemove = 55; break;
    case 'expert': cellsToRemove = 64; break;
  }

  const cellPositions = Array.from({ length: 81 }, (_, i) => i);
  for (let i = cellPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellPositions[i], cellPositions[j]] = [cellPositions[j], cellPositions[i]];
  }

  let removedCount = 0;
  for (const cellId of cellPositions) {
    if (removedCount >= cellsToRemove) {
      break;
    }
    const r = Math.floor(cellId / 9);
    const c = cellId % 9;

    const originalValue = puzzle[r][c];
    if (originalValue !== 0) {
      puzzle[r][c] = 0;
      if (countSolutions(puzzle, 2) === 1) {
        removedCount++;
      } else {
        puzzle[r][c] = originalValue;
      }
    }
  }

  return { puzzle, solution };
}

export function getConflictingCells(
  board: any[][],
  row: number,
  col: number,
  value: number
): [number, number][] {
  const conflicts: [number, number][] = [];

  const getValue = (cell: any) => {
    if (cell && typeof cell === 'object' && 'value' in cell) {
      return cell.value;
    }
    return cell;
  };

  // Row conflicts
  for (let x = 0; x < 9; x++) {
    if (x !== col && getValue(board[row][x]) === value) {
      conflicts.push([row, x]);
    }
  }

  // Col conflicts
  for (let x = 0; x < 9; x++) {
    if (x !== row && getValue(board[x][col]) === value) {
      conflicts.push([x, col]);
    }
  }

  // Box conflicts
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && getValue(board[r][c]) === value) {
        if (!conflicts.some(([cr, cc]) => cr === r && cc === c)) {
          conflicts.push([r, c]);
        }
      }
    }
  }

  return conflicts;
}
