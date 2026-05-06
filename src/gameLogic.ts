import { CellState } from './types';

export const getNeighbors = (x: number, y: number, z: number, size: number) => {
  const neighbors: { x: number; y: number; z: number }[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
          neighbors.push({ x: nx, y: ny, z: nz });
        }
      }
    }
  }
  return neighbors;
};

export const createGrid = (size: number): CellState[][][] => {
  const grid: CellState[][][] = [];
  for (let x = 0; x < size; x++) {
    grid[x] = [];
    for (let y = 0; y < size; y++) {
      grid[x][y] = [];
      for (let z = 0; z < size; z++) {
        grid[x][y][z] = {
          x,
          y,
          z,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0,
          shattered: false,
        };
      }
    }
  }
  return grid;
};

export const placeMines = (grid: CellState[][][], mineCount: number, startX: number, startY: number, startZ: number) => {
  const size = grid.length;
  let placed = 0;
  
  // Safe zone: exclude start cell and its neighbors
  const safeZone = new Set();
  safeZone.add(`${startX},${startY},${startZ}`);
  getNeighbors(startX, startY, startZ, size).forEach(n => {
    safeZone.add(`${n.x},${n.y},${n.z}`);
  });

  while (placed < mineCount) {
    const rx = Math.floor(Math.random() * size);
    const ry = Math.floor(Math.random() * size);
    const rz = Math.floor(Math.random() * size);
    const key = `${rx},${ry},${rz}`;

    if (!grid[rx][ry][rz].isMine && !safeZone.has(key)) {
      grid[rx][ry][rz].isMine = true;
      placed++;
    }
  }

  // Recalculate neighbor counts
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        if (!grid[x][y][z].isMine) {
          let count = 0;
          getNeighbors(x, y, z, size).forEach(n => {
            if (grid[n.x][n.y][n.z].isMine) count++;
          });
          grid[x][y][z].neighborMines = count;
        }
      }
    }
  }
};

export const redistributeMines = (grid: CellState[][][], mineCount: number) => {
  const size = grid.length;
  
  // Collect all cells that are not revealed and not mines (to place them)
  // Actually, we want to redistribute ALL mines into any unrevealed cell
  const unrevealedCells: { x: number; y: number; z: number }[] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        if (!grid[x][y][z].isRevealed) {
          unrevealedCells.push({ x, y, z });
          grid[x][y][z].isMine = false; // Reset existing mines
        }
      }
    }
  }

  // Randomly pick unique spots from unrevealed cells
  let placed = 0;
  const available = [...unrevealedCells];
  while (placed < mineCount && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    const cell = available.splice(idx, 1)[0];
    grid[cell.x][cell.y][cell.z].isMine = true;
    placed++;
  }

  // Recalculate neighbor counts for all cells
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        let count = 0;
        getNeighbors(x, y, z, size).forEach(n => {
          if (grid[n.x][n.y][n.z].isMine) count++;
        });
        grid[x][y][z].neighborMines = count;
      }
    }
  }
};

export const revealCellRecursive = (grid: CellState[][][], x: number, y: number, z: number) => {
  const size = grid.length;
  const cell = grid[x][y][z];
  if (cell.isRevealed || cell.isFlagged) return;

  cell.isRevealed = true;

  if (cell.neighborMines === 0 && !cell.isMine) {
    getNeighbors(x, y, z, size).forEach(n => {
      revealCellRecursive(grid, n.x, n.y, n.z);
    });
  }
};
