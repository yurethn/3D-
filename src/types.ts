export type Difficulty = 'Tutorial' | 'Beginner' | 'Intermediate' | 'Advanced' | 'Master' | 'Superhuman';

export interface GameConfig {
  size: number;
  mines: number;
  label: string;
}

export const DIFFICULTIES: Record<Difficulty, GameConfig> = {
  Tutorial: { size: 3, mines: 2, label: '튜토리얼' },
  Beginner: { size: 4, mines: 8, label: '초보' },
  Intermediate: { size: 6, mines: 24, label: '중수' },
  Advanced: { size: 8, mines: 64, label: '고수' },
  Master: { size: 10, mines: 120, label: '달인' },
  Superhuman: { size: 12, mines: 200, label: '초인' },
};

export interface CellState {
  x: number;
  y: number;
  z: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  shattered: boolean;
}

export type GameState = 'playing' | 'won' | 'lost' | 'idle';

export type InteractionMode = 'reveal' | 'flag';
