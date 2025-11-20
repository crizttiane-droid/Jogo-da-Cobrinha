
export type Point = {
  x: number;
  y: number;
};

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface GameState {
  snake: Point[];
  food: Point;
  direction: Direction;
  nextDirection: Direction; // Prevents rapid double-turn suicide
  score: number;
  highScore: number;
  status: GameStatus;
  speed: number;
  difficulty: Difficulty;
}

export interface AudioConfig {
  volume: number;
  enabled: boolean;
}

export interface ScoreEntry {
  name: string;
  score: number;
  difficulty: Difficulty;
  date: string;
}
