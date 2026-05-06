import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Difficulty, DIFFICULTIES, CellState, GameState, InteractionMode } from '../types';
import { createGrid, placeMines, revealCellRecursive, redistributeMines } from '../gameLogic';
import { Cell } from './Cell';
import { Explosion } from './Explosion';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Bomb, RefreshCw, ChevronRight, Info, Skull, Maximize } from 'lucide-react';

export default function MinesweeperScene() {
  const [difficulty, setDifficulty] = useState<Difficulty>('Beginner');
  const [grid, setGrid] = useState<CellState[][][]>([]);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [mineCount, setMineCount] = useState(0);
  const [flagCount, setFlagCount] = useState(0);
  const [revealsCount, setRevealsCount] = useState(0);
  const [lastShattered, setLastShattered] = useState<[number, number, number] | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string }[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  const controlsRef = useRef<any>(null);
  
  // Slicing state for visibility
  const [sliceX, setSliceX] = useState<[number, number]>([0, 12]);
  const [sliceY, setSliceY] = useState<[number, number]>([0, 12]);
  const [sliceZ, setSliceZ] = useState<[number, number]>([0, 12]);
  const [showTutorial, setShowTutorial] = useState(true);
  const [xRayMode, setXRayMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('reveal');

  const config = DIFFICULTIES[difficulty];

  // Initialize game
  const resetGame = useCallback((newDifficulty?: Difficulty) => {
    const d = newDifficulty || difficulty;
    const cfg = DIFFICULTIES[d];
    const newGrid = createGrid(cfg.size);
    setGrid(newGrid);
    setGameState('idle');
    setMineCount(cfg.mines);
    setFlagCount(0);
    setRevealsCount(0);
    setLastShattered(null);
    setNotifications([]);
    setStartTime(null);
    setCurrentTime(0);
    
    // Reset slices to full size
    setSliceX([0, cfg.size - 1]);
    setSliceY([0, cfg.size - 1]);
    setSliceZ([0, cfg.size - 1]);

    // Reset camera when difficulty changes manually
    if (newDifficulty && controlsRef.current) {
      controlsRef.current.reset();
    }
  }, [difficulty]);

  const resetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Timer
  useEffect(() => {
    let interval: any;
    if (gameState === 'playing' && startTime) {
      interval = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, startTime]);

  // Handle cell reveal
  const handleReveal = (x: number, y: number, z: number) => {
    if (gameState === 'won' || gameState === 'lost') return;

    let newGrid = [...grid.map(row => row.map(col => col.map(c => ({ ...c }))))];
    const cell = newGrid[x][y][z];

    if (cell.isFlagged) return;

    if (gameState === 'idle') {
      placeMines(newGrid, config.mines, x, y, z);
      setGameState('playing');
      setStartTime(Date.now());
    }

    if (cell.isMine) {
      cell.isRevealed = true;
      cell.shattered = true;
      const offset = (config.size - 1) / 2;
      setLastShattered([x - offset, y - offset, z - offset]);
      setGameState('lost');
    } else {
      revealCellRecursive(newGrid, x, y, z);
      
      // Superhuman redistribution logic
      if (difficulty === 'Superhuman' && gameState === 'playing') {
        const nextRevealCount = revealsCount + 1;
        setRevealsCount(nextRevealCount);
        if (nextRevealCount % 10 === 0) {
          redistributeMines(newGrid, config.mines);
          const id = Math.random().toString(36).substring(7);
          setNotifications(prev => [...prev, { id, text: '지뢰의 위치가 무작위로 재배치되었습니다!' }]);
          setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
        }
      }
    }

    // Check Win
    let unrevealedSafe = 0;
    for (let i = 0; i < config.size; i++) {
      for (let j = 0; j < config.size; j++) {
        for (let k = 0; k < config.size; k++) {
          if (!newGrid[i][j][k].isMine && !newGrid[i][j][k].isRevealed) unrevealedSafe++;
        }
      }
    }

    if (unrevealedSafe === 0 && !cell.isMine) {
      setGameState('won');
    }

    setGrid(newGrid);
  };

  const handleFlag = (x: number, y: number, z: number) => {
    if (gameState === 'won' || gameState === 'lost') return;
    const newGrid = [...grid.map(row => row.map(col => col.map(c => ({ ...c }))))];
    const cell = newGrid[x][y][z];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    setFlagCount(prev => (cell.isFlagged ? prev + 1 : prev - 1));
    setGrid(newGrid);
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">
      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[config.size * 1.5, config.size * 1.5, config.size * 1.5]} fov={50} />
        <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} minDistance={2} maxDistance={config.size * 4} />
        
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
        <spotLight position={[-10, 10, 5]} angle={0.3} penumbra={1} intensity={1} castShadow />
        
        <group>
          {grid.flat(2).map((cell) => {
            const isVisible = 
              cell.x >= sliceX[0] && cell.x <= sliceX[1] &&
              cell.y >= sliceY[0] && cell.y <= sliceY[1] &&
              cell.z >= sliceZ[0] && cell.z <= sliceZ[1];
            
            return (
              <Cell 
                key={`${cell.x}-${cell.y}-${cell.z}`} 
                cell={cell} 
                onReveal={handleReveal} 
                onFlag={handleFlag} 
                gameSize={config.size}
                isVisible={isVisible}
                interactionMode={interactionMode}
              />
            );
          })}
        </group>

        {lastShattered && <Explosion position={lastShattered} />}
        
        <ContactShadows position={[0, -config.size / 2 - 0.5, 0]} opacity={0.4} scale={config.size * 2} blur={2.4} />
      </Canvas>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        {/* Header HUD */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Difficulties</span>
                <div className="flex gap-2">
                  {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDifficulty(d);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                        difficulty === d 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/20' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {DIFFICULTIES[d].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl inline-flex gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Game Timer</span>
                <span className="text-2xl font-mono text-blue-400 leading-none">
                  {Math.floor(currentTime / 60).toString().padStart(2, '0')}:{(currentTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-col border-l border-slate-800 pl-8">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Mines Left</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono text-orange-400 leading-none">{Math.max(0, mineCount - flagCount)}</span>
                  <span className="text-[10px] text-slate-500 font-bold">/ {mineCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button 
              onClick={resetCamera}
              className="px-4 py-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl h-fit hover:bg-slate-800 transition-all pointer-events-auto flex items-center gap-2"
              title="카메라 위치 초기화"
            >
              <Maximize className="w-5 h-5 text-blue-400" />
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">카메라 위치 초기화</span>
            </button>
            <button 
              onClick={() => setShowTutorial(true)}
              className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl h-fit hover:bg-slate-800 transition-colors pointer-events-auto"
              title="도움말"
            >
              <Info className="w-6 h-6 text-slate-400" />
            </button>
            <button 
              onClick={() => resetGame()}
              className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl h-fit hover:bg-slate-800 transition-colors pointer-events-auto"
              title="다시 시작"
            >
              <RefreshCw className={`w-6 h-6 text-slate-400 ${gameState === 'playing' ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        {/* Interaction Mode Toggle */}
        <div className="absolute left-6 bottom-32 flex flex-col gap-3 pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-2xl shadow-2xl flex flex-col gap-2">
            <button
              onClick={() => setInteractionMode('reveal')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                interactionMode === 'reveal'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Bomb size={20} />
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold uppercase tracking-tight">지뢰 탐색</span>
                <span className="text-[10px] opacity-80">큐브를 파냅니다</span>
              </div>
            </button>
            <button
              onClick={() => setInteractionMode('flag')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                interactionMode === 'flag'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div className="text-xl">🚩</div>
              <div className="flex flex-col items-start ml-0.5">
                <span className="text-xs font-bold uppercase tracking-tight">깃발 설치</span>
                <span className="text-[10px] opacity-80">위험 표시를 합니다</span>
              </div>
            </button>
          </div>
        </div>

        {/* Slice Controls */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 space-y-8 bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 p-6 rounded-3xl pointer-events-auto">
          <div className="space-y-4">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block">Grid Slice (X/Y/Z)</span>
            {[['X', sliceX, setSliceX], ['Y', sliceY, setSliceY], ['Z', sliceZ, setSliceZ]].map(([label, val, set]: any) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{label}</span>
                  <span>{val[0]} - {val[1]}</span>
                </div>
                <input 
                  type="range" min="0" max={config.size - 1} value={val[0]} 
                  onChange={(e) => set([parseInt(e.target.value), Math.max(parseInt(e.target.value), val[1])])}
                  className="w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input 
                  type="range" min="0" max={config.size - 1} value={val[1]} 
                  onChange={(e) => set([Math.min(parseInt(e.target.value), val[0]), parseInt(e.target.value)])}
                  className="w-32 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Notifications & Notifications Center */}
        <div className="flex flex-col items-center gap-4 mb-24">
          <AnimatePresence>
            {notifications.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-xl shadow-2xl shadow-red-500/10"
              >
                <Info size={18} />
                <span className="font-semibold">{note.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Status Modals */}
        <AnimatePresence>
          {showTutorial && (
            <motion.div 
              key="tutorial-modal"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-[100]"
            >
              <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-3xl text-center">
                <div className="text-blue-500 mb-6 flex justify-center"><Skull size={48} className="text-slate-400" /></div>
                <h2 className="text-3xl font-bold text-white mb-2">3D 지뢰찾기 룰 안내</h2>
                <p className="text-slate-500 text-sm mb-8 italic">3차원 공간에서 펼쳐지는 극한의 심리전</p>
                
                <div className="space-y-4 text-slate-400 text-sm text-left mb-8 border-y border-slate-800 py-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold border border-blue-500/20">1</div>
                    <p><span className="text-slate-200 font-bold">기본 규칙:</span> 큐브 속 숫자는 상하좌우, 대각선을 포함한 주변 26개 칸의 지뢰 개수를 의미합니다.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold border border-blue-500/20">2</div>
                    <p><span className="text-slate-200 font-bold">조작법:</span> <span className="text-blue-400">좌클릭</span>으로 열기, <span className="text-orange-400">우클릭</span>으로 깃발을 꽂습니다. 드래그로 3D 공간을 회전하세요.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 font-bold border border-blue-500/20">3</div>
                    <p><span className="text-slate-200 font-bold">단면 보기:</span> 우측 슬라이더를 조절하여 큐브의 <span className="text-emerald-400 font-bold">내부 단면</span>을 확인하며 추론할 수 있습니다.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 font-bold border border-red-500/20">!</div>
                    <p><span className="text-red-400 font-bold">초인 모드:</span> 10회 클릭마다 <span className="text-red-300">지뢰 위치가 바뀝니다.</span> 빠르게 판단하고 움직이세요!</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setShowTutorial(false)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-lg"
                >
                  명을 받듭니다
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'won' && (
            <motion.div 
              key="won-modal"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-12 rounded-[2rem] text-center shadow-3xl max-w-sm"
              >
                <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">승리!</h2>
                <p className="text-slate-400 mb-8 font-medium">모든 지뢰를 성공적으로 피했습니다.</p>
                <div className="text-slate-500 text-sm mb-8 flex justify-between px-4">
                  <span>걸린 시간: {Math.floor(currentTime / 60)}분 {currentTime % 60}초</span>
                </div>
                <button 
                  onClick={() => resetGame()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  다시 시작하기
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'lost' && (
            <motion.div 
              key="lost-modal"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 p-12 rounded-[2rem] text-center shadow-3xl max-w-sm"
              >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Skull className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">게임 오버</h2>
                <p className="text-slate-400 mb-8 font-medium">지뢰를 밟았습니다.</p>
                <button 
                  onClick={() => resetGame()}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-slate-700 active:scale-95 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  재시도
                </button>
              </motion.div>
            </motion.div>
          )}

          {gameState === 'idle' && (
            <div key="idle-indicator" className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none">
              <motion.div 
                animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-3 bg-slate-900/40 px-6 py-2 rounded-full border border-slate-800/50 backdrop-blur-sm"
              >
                <ChevronRight size={16} className="text-blue-500" />
                <span className="text-slate-400 text-sm font-medium italic">임의의 큐브를 클릭하여 게임을 시작하세요</span>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer Info */}
        <div className="flex justify-between items-end">
          <div className="flex gap-4">
             <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-xl border border-slate-800/30">
               <div className="flex flex-col">
                 <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Size</span>
                 <span className="text-xs font-semibold text-slate-300">{config.size}x{config.size}x{config.size}</span>
               </div>
             </div>
             {difficulty === 'Tutorial' && (
               <div className="flex items-center gap-2 bg-blue-900/20 px-4 py-2 rounded-xl border border-blue-800/30">
                 <div className="flex flex-col text-left">
                   <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold">Tutorial Active</span>
                   <span className="text-xs font-semibold text-blue-300">간단한 3x3x3 그리드로 시작하세요</span>
                 </div>
               </div>
             )}
             {difficulty === 'Superhuman' && (
               <div className="flex items-center gap-2 bg-red-900/20 px-4 py-2 rounded-xl border border-red-800/30">
                 <div className="flex flex-col">
                   <span className="text-[9px] uppercase tracking-widest text-red-400 font-bold underline decoration-dotted">Superhuman Active</span>
                   <span className="text-xs font-semibold text-red-300">지뢰 재배치 대기</span>
                 </div>
               </div>
             )}
          </div>
          
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
            3D Minesweeper Engine • 2026
          </div>
        </div>
      </div>
    </div>
  );
}
