import React from 'react';
import { Direction, GameStatus } from '../types';

interface ControlsProps {
  onDirectionChange: (dir: Direction) => void;
  onPauseToggle: () => void;
  onRestart: () => void;
  status: GameStatus;
}

const Controls: React.FC<ControlsProps> = ({ onDirectionChange, onPauseToggle, onRestart, status }) => {
  
  const btnClass = "bg-gray-800 active:bg-green-700 text-white font-bold py-4 rounded-lg shadow-lg touch-manipulation select-none border-b-4 border-gray-950 active:border-b-0 active:translate-y-1 transition-all";

  return (
    <div className="flex flex-col w-full max-w-[500px] gap-4 mt-4">
      
      {/* Main Action Buttons */}
      <div className="flex justify-between gap-4">
        <button 
          onClick={onPauseToggle}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest text-sm"
        >
          {status === GameStatus.PAUSED ? "Continuar" : status === GameStatus.PLAYING ? "Pausar" : "Iniciar"}
        </button>
        <button 
          onClick={onRestart}
          className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest text-sm"
        >
          Reiniciar
        </button>
      </div>

      {/* D-Pad for Touch Devices (Visible mainly on mobile via layout, but kept in flow) */}
      <div className="grid grid-cols-3 gap-2 h-48 md:hidden">
        <div /> {/* Empty Top Left */}
        <button 
          className={btnClass} 
          onClick={() => onDirectionChange(Direction.UP)}
          aria-label="Cima"
        >
          ▲
        </button>
        <div /> {/* Empty Top Right */}
        
        <button 
          className={btnClass} 
          onClick={() => onDirectionChange(Direction.LEFT)}
          aria-label="Esquerda"
        >
          ◀
        </button>
        <button 
          className={btnClass} 
          onClick={() => onDirectionChange(Direction.DOWN)}
          aria-label="Baixo"
        >
          ▼
        </button>
        <button 
          className={btnClass} 
          onClick={() => onDirectionChange(Direction.RIGHT)}
          aria-label="Direita"
        >
          ▶
        </button>
      </div>
      
      <div className="hidden md:flex text-center text-gray-500 text-sm justify-center gap-8">
        <span>Setas ou WASD para Mover</span>
        <span>ESPAÇO para Pausar</span>
      </div>
    </div>
  );
};

export default Controls;