import React, { useMemo } from 'react';
import { GRID_SIZE } from '../constants';
import { Point, GameStatus } from '../types';

interface GridProps {
  snake: Point[];
  food: Point;
  status: GameStatus;
}

const Grid: React.FC<GridProps> = ({ snake, food, status }) => {
  // Generate grid cells once
  const cells = useMemo(() => {
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      x: i % GRID_SIZE,
      y: Math.floor(i / GRID_SIZE),
      id: i,
    }));
  }, []);

  const isSnakeHead = (x: number, y: number) => snake[0].x === x && snake[0].y === y;
  const isSnakeBody = (x: number, y: number) => 
    snake.some((p, index) => index !== 0 && p.x === x && p.y === y);
  const isFood = (x: number, y: number) => food.x === x && food.y === y;

  // Calculate responsive cell size based on CSS Grid
  // We use a container that maintains aspect ratio
  return (
    <div 
      className="relative bg-gray-900 border-4 border-gray-700 rounded-lg shadow-2xl shadow-green-900/20 overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
        aspectRatio: '1/1',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      {cells.map((cell) => {
        const head = isSnakeHead(cell.x, cell.y);
        const body = isSnakeBody(cell.x, cell.y);
        const foodItem = isFood(cell.x, cell.y);

        let classes = "w-full h-full border-[0.5px] border-gray-800/30 "; // Subtle grid lines

        if (head) {
          classes += status === GameStatus.GAME_OVER ? "bg-red-600 z-10" : "bg-green-400 z-10 rounded-sm";
        } else if (body) {
           // Fade body color slightly towards tail for effect? Keeping it simple for now.
          classes += status === GameStatus.GAME_OVER ? "bg-red-900/50" : "bg-green-600 rounded-sm scale-90";
        } else if (foodItem) {
          classes += "bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse z-10";
        }

        return (
          <div key={cell.id} className={classes} />
        );
      })}
      
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-20 background-size-[100%_2px,3px_100%]" style={{ backgroundSize: "100% 4px, 6px 100%" }}></div>
    </div>
  );
};

export default Grid;