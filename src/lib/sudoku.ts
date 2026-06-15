export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function isValid(board: number[][], row: number, col: number, num: number): boolean {
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

function solveSudoku(board: number[][]): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (solveSudoku(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generateSudoku(difficulty: Difficulty): { puzzle: number[][]; solution: number[][] } {
  const solution = createEmptyBoard();
  
  // Fill diagonal blocks first to make full generation faster
  const fillDiagonal = () => {
    for (let i = 0; i < 9; i = i + 3) {
      fillBlock(i, i);
    }
  }

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
  }

  const isValidInBlock = (board: number[][], rowStart: number, colStart: number, num: number) => {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[rowStart + i][colStart + j] === num) return false;
      }
    }
    return true;
  }

  fillDiagonal();
  solveSudoku(solution);

  const puzzle = solution.map(row => [...row]);
  
  let cellsToRemove = 0;
  switch (difficulty) {
    case 'easy': cellsToRemove = 30; break;
    case 'medium': cellsToRemove = 45; break;
    case 'hard': cellsToRemove = 55; break;
    case 'expert': cellsToRemove = 64; break;
  }

  let count = cellsToRemove;
  while (count !== 0) {
    let cellId = Math.floor(Math.random() * 81);
    let i = Math.floor(cellId / 9);
    let j = cellId % 9;
    if (puzzle[i][j] !== 0) {
      puzzle[i][j] = 0;
      count--;
    }
  }

  return { puzzle, solution };
}
