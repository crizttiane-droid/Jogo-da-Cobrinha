
import { Direction, GameState, GameStatus, Difficulty } from './types';

export const GRID_SIZE = 20;
export const MIN_SPEED = 50;
export const SPEED_DECREMENT = 2;

export const DIFFICULTY_CONFIG = {
  [Difficulty.EASY]: {
    label: 'FÁCIL',
    speed: 200,
    points: 1,
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
  },
  [Difficulty.MEDIUM]: {
    label: 'MÉDIO',
    speed: 130,
    points: 2,
    color: 'text-green-400',
    borderColor: 'border-green-500',
  },
  [Difficulty.HARD]: {
    label: 'DIFÍCIL',
    speed: 80,
    points: 3,
    color: 'text-red-400',
    borderColor: 'border-red-500',
  },
};

export const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

export const INITIAL_STATE: GameState = {
  snake: INITIAL_SNAKE,
  food: { x: 5, y: 5 },
  direction: Direction.UP,
  nextDirection: Direction.UP,
  score: 0,
  highScore: parseInt(localStorage.getItem('snake_highscore') || '0', 10),
  status: GameStatus.IDLE,
  speed: DIFFICULTY_CONFIG[Difficulty.MEDIUM].speed,
  difficulty: Difficulty.MEDIUM,
};

export const DIRECTIONS = {
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 },
};
