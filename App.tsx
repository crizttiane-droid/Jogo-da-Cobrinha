
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GRID_SIZE, 
  INITIAL_STATE, 
  DIRECTIONS, 
  MIN_SPEED, 
  SPEED_DECREMENT,
  DIFFICULTY_CONFIG
} from './constants';
import { Direction, GameState, GameStatus, Point, Difficulty, ScoreEntry } from './types';
import Grid from './components/Grid';
import Controls from './components/Controls';
import { audioService } from './services/audioService';
import { getGameOverCommentary } from './services/geminiService';

// Helper to check collision
const checkCollision = (head: Point, snake: Point[]) => {
  // Wall collision
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }
  // Self collision (ignore tail as it will move away, but simplifying check to whole body for safety)
  for (let i = 0; i < snake.length - 1; i++) { // -1 because head is at 0 not checked yet in movement logic usually, but here head is tentative
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true;
    }
  }
  return false;
};

// Helper to generate food
const generateFood = (snake: Point[]): Point => {
  let newFood: Point;
  let isCollision;
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    // eslint-disable-next-line no-loop-func
    isCollision = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
  } while (isCollision);
  return newFood;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [aiComment, setAiComment] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Ranking State
  const [ranking, setRanking] = useState<ScoreEntry[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isNewHighscore, setIsNewHighscore] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  
  // Touch handling refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Load Ranking and Highscore on Mount
  useEffect(() => {
    const savedRanking = localStorage.getItem('snake_ranking');
    if (savedRanking) {
      setRanking(JSON.parse(savedRanking));
    }
    const savedHigh = localStorage.getItem('snake_highscore');
    if (savedHigh) {
      setGameState(prev => ({ ...prev, highScore: parseInt(savedHigh, 10) }));
    }
  }, []);

  // Persist highscore (legacy support) and Ranking
  useEffect(() => {
    localStorage.setItem('snake_highscore', gameState.highScore.toString());
  }, [gameState.highScore]);

  useEffect(() => {
    if (ranking.length > 0) {
      localStorage.setItem('snake_ranking', JSON.stringify(ranking));
    }
  }, [ranking]);

  // Audio toggle wrapper
  const toggleAudio = () => {
    const newState = !audioEnabled;
    setAudioEnabled(newState);
    audioService.setEnabled(newState);
  };

  // Set difficulty
  const setDifficulty = (difficulty: Difficulty) => {
    if (gameState.status === GameStatus.IDLE) {
      setGameState(prev => ({
        ...prev,
        difficulty,
        speed: DIFFICULTY_CONFIG[difficulty].speed
      }));
    }
  };

  const handleSaveScore = () => {
    if (!playerName.trim()) return;

    const newEntry: ScoreEntry = {
      name: playerName.toUpperCase().slice(0, 3),
      score: gameState.score,
      difficulty: gameState.difficulty,
      date: new Date().toLocaleDateString('pt-BR')
    };

    const newRanking = [...ranking, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Keep top 5

    setRanking(newRanking);
    setIsNewHighscore(false); // Hide input
    setShowRanking(true); // Show ranking immediately
  };

  const handleShare = async () => {
    const text = `🐍 JOGO DA COBRINHA\nFiz ${gameState.score} pontos no modo ${DIFFICULTY_CONFIG[gameState.difficulty].label}!\n\nTente me vencer: ${window.location.href}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Jogo da Cobrinha',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShowCopiedToast(true);
        setTimeout(() => setShowCopiedToast(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Core Game Logic Step
  const gameStep = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;

      const head = prev.snake[0];
      const dir = DIRECTIONS[prev.nextDirection];
      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // 1. Check Collision
      if (
        newHead.x < 0 || 
        newHead.x >= GRID_SIZE || 
        newHead.y < 0 || 
        newHead.y >= GRID_SIZE ||
        prev.snake.some(p => p.x === newHead.x && p.y === newHead.y)
      ) {
        audioService.playGameOver();
        // Trigger AI commentary
        getGameOverCommentary(prev.score, prev.highScore).then(setAiComment);

        // Check if score qualifies for ranking
        const qualifies = prev.score > 0 && (
          ranking.length < 5 || prev.score > ranking[ranking.length - 1].score
        );

        if (qualifies) {
          setIsNewHighscore(true);
          setPlayerName('');
        }

        return {
          ...prev,
          status: GameStatus.GAME_OVER,
          highScore: Math.max(prev.score, prev.highScore)
        };
      }

      const newSnake = [newHead, ...prev.snake];
      let newScore = prev.score;
      let newFood = prev.food;
      let newSpeed = prev.speed;

      // 2. Check Food
      if (newHead.x === prev.food.x && newHead.y === prev.food.y) {
        // Points based on difficulty
        newScore += DIFFICULTY_CONFIG[prev.difficulty].points;
        newFood = generateFood(newSnake);
        newSpeed = Math.max(MIN_SPEED, prev.speed - SPEED_DECREMENT);
        audioService.playEat();
      } else {
        newSnake.pop(); // Remove tail if not eating
      }

      return {
        ...prev,
        snake: newSnake,
        food: newFood,
        score: newScore,
        speed: newSpeed,
        direction: prev.nextDirection, // Commit the direction
      };
    });
  }, [ranking]);

  // Game Loop Driver
  useEffect(() => {
    const loop = (time: number) => {
      if (gameState.status === GameStatus.PLAYING) {
        if (time - lastTimeRef.current >= gameState.speed) {
          gameStep();
          lastTimeRef.current = time;
        }
      }
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState.status, gameState.speed, gameStep]);

  // Input Handling
  const handleDirection = useCallback((newDir: Direction) => {
    setGameState(prev => {
      // Prevent reversing directly
      const currentDir = prev.direction;
      if (prev.status !== GameStatus.PLAYING && prev.status !== GameStatus.IDLE) return prev;
      
      // If IDLE, start game on move
      const status = prev.status === GameStatus.IDLE ? GameStatus.PLAYING : prev.status;
      if (status === GameStatus.PLAYING && prev.status === GameStatus.IDLE) {
        audioService.playStart();
      }

      if (newDir === Direction.UP && currentDir === Direction.DOWN) return { ...prev, status };
      if (newDir === Direction.DOWN && currentDir === Direction.UP) return { ...prev, status };
      if (newDir === Direction.LEFT && currentDir === Direction.RIGHT) return { ...prev, status };
      if (newDir === Direction.RIGHT && currentDir === Direction.LEFT) return { ...prev, status };

      return { ...prev, nextDirection: newDir, status };
    });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // If typing name, don't trigger game controls
    if (isNewHighscore) return;

    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        handleDirection(Direction.UP);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        handleDirection(Direction.DOWN);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        handleDirection(Direction.LEFT);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        handleDirection(Direction.RIGHT);
        break;
      case ' ':
      case 'Enter':
        // Toggle Pause or Restart
        if (showRanking) {
            setShowRanking(false);
            return;
        }
        setGameState(prev => {
          if (prev.status === GameStatus.GAME_OVER) {
             setAiComment('');
             setIsNewHighscore(false);
             return { 
               ...INITIAL_STATE, 
               highScore: prev.highScore, 
               status: GameStatus.PLAYING,
               difficulty: prev.difficulty, // Keep selected difficulty
               speed: DIFFICULTY_CONFIG[prev.difficulty].speed // Reset speed to difficulty base
             };
          }
          if (prev.status === GameStatus.PLAYING) return { ...prev, status: GameStatus.PAUSED };
          if (prev.status === GameStatus.PAUSED) return { ...prev, status: GameStatus.PLAYING };
          if (prev.status === GameStatus.IDLE) {
             audioService.playStart();
             return { ...prev, status: GameStatus.PLAYING };
          }
          return prev;
        });
        break;
    }
  }, [handleDirection, isNewHighscore, showRanking]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Swipe Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    const minSwipeDistance = 30; // px

    if (Math.abs(diffX) < minSwipeDistance && Math.abs(diffY) < minSwipeDistance) return;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal
      if (diffX > 0) handleDirection(Direction.RIGHT);
      else handleDirection(Direction.LEFT);
    } else {
      // Vertical
      if (diffY > 0) handleDirection(Direction.DOWN);
      else handleDirection(Direction.UP);
    }
    
    touchStartRef.current = null;
  };

  // Controls Actions
  const handleRestart = () => {
    setAiComment('');
    setIsNewHighscore(false);
    setShowRanking(false);
    setGameState(prev => ({ 
      ...INITIAL_STATE, 
      highScore: prev.highScore,
      difficulty: prev.difficulty,
      speed: DIFFICULTY_CONFIG[prev.difficulty].speed
    }));
  };

  const handlePause = () => {
    setGameState(prev => {
      if (prev.status === GameStatus.PLAYING) return { ...prev, status: GameStatus.PAUSED };
      if (prev.status === GameStatus.PAUSED) return { ...prev, status: GameStatus.PLAYING };
      if (prev.status === GameStatus.IDLE) {
        audioService.playStart();
        return { ...prev, status: GameStatus.PLAYING };
      }
      return prev;
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-4 select-none">
      {/* Header / Scoreboard */}
      <div className="w-full max-w-[500px] flex justify-between items-end mb-4 text-green-400 font-mono">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-white">
            JOGO DA COBRINHA<span className="animate-pulse">_</span>
          </h1>
          <div className="flex gap-2 mt-1">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
               gameState.difficulty === key && (
                 <span key={key} className={`text-xs font-bold px-2 py-0.5 rounded bg-gray-800 border ${config.borderColor} ${config.color}`}>
                   {config.label}
                 </span>
               )
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">RECORDE: <span className="text-white">{gameState.highScore}</span></div>
          <div className="text-3xl font-bold leading-none">{gameState.score.toString().padStart(3, '0')}</div>
        </div>
      </div>

      {/* Game Area */}
      <div 
        className="relative w-full max-w-[500px] touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Grid snake={gameState.snake} food={gameState.food} status={gameState.status} />
        
        {/* Overlays */}
        {/* IDLE SCREEN */}
        {gameState.status === GameStatus.IDLE && !showRanking && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30 rounded-lg">
            <div className="text-center flex flex-col items-center w-full px-6">
              <p className="text-white font-bold text-xl mb-4 shadow-black drop-shadow-md animate-pulse">PRESSIONE INICIAR</p>
              
              {/* Difficulty Selector */}
              <div className="mb-6 w-full">
                <p className="text-gray-400 text-xs mb-2 uppercase tracking-wider">Selecione a Dificuldade</p>
                <div className="flex justify-between gap-2 w-full">
                  {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`flex-1 py-2 text-xs font-bold rounded border-b-2 transition-all ${
                        gameState.difficulty === diff 
                          ? `bg-gray-700 text-white ${DIFFICULTY_CONFIG[diff].borderColor} border-b-4 translate-y-0` 
                          : 'bg-gray-900 text-gray-500 border-gray-800 hover:bg-gray-800'
                      }`}
                    >
                      {DIFFICULTY_CONFIG[diff].label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 h-4">
                  {gameState.difficulty === Difficulty.EASY && "Lento • 1 pt"}
                  {gameState.difficulty === Difficulty.MEDIUM && "Normal • 2 pts"}
                  {gameState.difficulty === Difficulty.HARD && "Rápido • 3 pts"}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-3 mb-4 w-full">
                <p className="text-gray-300 text-xs leading-relaxed">
                  <span className="text-red-400 font-bold">Objetivo:</span> Coma a comida.<br/>
                  <span className="text-red-400 font-bold">Cuidado:</span> Evite paredes/cauda.
                </p>
              </div>

              <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => setShowRanking(true)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded border-b-4 border-yellow-800 text-xs"
                  >
                    🏆 RANKING
                  </button>
              </div>

              <p className="text-green-400/80 text-[10px] mt-4 mb-2 uppercase tracking-widest">Ou deslize na tela</p>
              
              {/* Visual Arrow Keys */}
              <div className="flex flex-col items-center gap-1 opacity-80 scale-90">
                <div className="w-8 h-8 border-2 border-green-500/50 rounded bg-gray-800 flex items-center justify-center text-green-400 font-bold text-xs">▲</div>
                <div className="flex gap-1">
                  <div className="w-8 h-8 border-2 border-green-500/50 rounded bg-gray-800 flex items-center justify-center text-green-400 font-bold text-xs">◀</div>
                  <div className="w-8 h-8 border-2 border-green-500/50 rounded bg-gray-800 flex items-center justify-center text-green-400 font-bold text-xs">▼</div>
                  <div className="w-8 h-8 border-2 border-green-500/50 rounded bg-gray-800 flex items-center justify-center text-green-400 font-bold text-xs">▶</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAUSE SCREEN */}
        {gameState.status === GameStatus.PAUSED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30 rounded-lg">
             <p className="text-white font-bold text-2xl tracking-widest">PAUSADO</p>
          </div>
        )}

        {/* GAME OVER SCREEN */}
        {gameState.status === GameStatus.GAME_OVER && !showRanking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-30 rounded-lg p-6 text-center overflow-y-auto">
             <h2 className="text-red-500 font-bold text-4xl mb-2 tracking-widest">FIM DE JOGO</h2>
             <p className="text-white text-lg mb-4">Pontuação: {gameState.score}</p>
             
             {/* High Score Input */}
             {isNewHighscore ? (
               <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg mb-4 w-full animate-pulse">
                 <p className="text-yellow-400 font-bold text-sm mb-2">NOVO RECORDE!</p>
                 <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 3))}
                      placeholder="AAA"
                      className="bg-black border-2 border-yellow-600 text-white text-center text-2xl font-mono tracking-[0.5em] rounded p-2 uppercase focus:outline-none focus:border-yellow-400"
                      autoFocus
                    />
                    <button 
                      onClick={handleSaveScore}
                      disabled={playerName.length === 0}
                      className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-2 rounded text-sm"
                    >
                      SALVAR
                    </button>
                 </div>
               </div>
             ) : (
               /* AI Commentary Section (Only if not inputting score) */
               <div className="bg-gray-800 p-4 rounded border border-green-500/30 mb-6 w-full shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                 <p className="text-green-100 italic min-h-[1.5rem]">
                   {aiComment ? `"${aiComment}"` : <span className="animate-pulse">Analisando jogada...</span>}
                 </p>
               </div>
             )}

             {!isNewHighscore && (
               <div className="flex flex-col gap-3 w-full">
                 <div className="flex gap-2 w-full">
                   <button 
                     onClick={() => setShowRanking(true)}
                     className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg text-xs"
                   >
                     RANKING
                   </button>
                   <button 
                     onClick={handleRestart}
                     className="flex-[2] bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
                   >
                     TENTAR DE NOVO
                   </button>
                 </div>
                 <button 
                    onClick={handleShare}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-xs border-b-4 border-blue-800 active:border-b-0 active:translate-y-1 transition-all"
                 >
                    {showCopiedToast ? "COPIADO!" : "COMPARTILHAR PONTUAÇÃO"}
                 </button>
               </div>
             )}
          </div>
        )}

        {/* RANKING SCREEN */}
        {showRanking && (
          <div className="absolute inset-0 flex flex-col items-center bg-gray-900 z-40 rounded-lg p-4">
            <div className="w-full flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
              <h2 className="text-yellow-400 font-bold text-xl tracking-widest">RANKING TOP 5</h2>
              <button onClick={() => setShowRanking(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="w-full flex-1 overflow-y-auto">
              {ranking.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">Ainda sem recordes. Jogue agora!</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800">
                      <th className="pb-2 text-left">NOME</th>
                      <th className="pb-2 text-center">MODO</th>
                      <th className="pb-2 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {ranking.map((entry, idx) => (
                      <tr key={idx} className={`border-b border-gray-800/50 ${idx === 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
                        <td className="py-3 font-bold tracking-wider">{idx + 1}. {entry.name}</td>
                        <td className="py-3 text-center">
                          <span className={`text-[10px] px-1 rounded border ${DIFFICULTY_CONFIG[entry.difficulty].borderColor} ${DIFFICULTY_CONFIG[entry.difficulty].color} bg-gray-900`}>
                            {DIFFICULTY_CONFIG[entry.difficulty].label}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button 
               onClick={() => setShowRanking(false)}
               className="w-full mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
             >
               VOLTAR
             </button>
          </div>
        )}
      </div>

      <Controls 
        onDirectionChange={handleDirection} 
        onPauseToggle={handlePause}
        onRestart={handleRestart}
        status={gameState.status}
      />

      {/* Settings Footer */}
      <div className="mt-6 flex gap-4 text-gray-500 text-xs">
        <button 
          onClick={toggleAudio}
          className={`flex items-center gap-1 hover:text-white transition-colors ${audioEnabled ? 'text-green-400' : ''}`}
        >
          {audioEnabled ? '🔊 SOM LIGADO' : '🔇 SOM DESLIGADO'}
        </button>
      </div>
    </div>
  );
};

export default App;
