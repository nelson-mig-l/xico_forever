import { useEffect, useRef, useState } from 'react';
import { Game } from './Game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const policeCountRef = useRef<HTMLDivElement>(null);
  const destroyedCountRef = useRef<HTMLDivElement>(null);
  const lostCountRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const [policeData, setPoliceData] = useState<{ id: number; health: number }[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [resetCount, setResetCount] = useState(0);

  // Speedometer element refs
  const speedNumberRef = useRef<HTMLSpanElement>(null);
  const speedGaugeRef = useRef<SVGCircleElement>(null);

  // MiniMap element ref
  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const game = new Game(canvasRef.current, (score, policeCount, destroyedCount, policeData, lostCount, speed, maxSpeed, isDrifting, fps) => {
        if (scoreRef.current) {
          scoreRef.current.innerText = `SCORE: ${Math.floor(score)}`;
        }
        if (policeCountRef.current) {
          policeCountRef.current.innerText = `POLICE: ${policeCount}`;
        }
        if (destroyedCountRef.current) {
          destroyedCountRef.current.innerText = `DESTROYED: ${destroyedCount}`;
        }
        if (lostCountRef.current) {
          lostCountRef.current.innerText = `LOST: ${lostCount}`;
        }
        if (fpsRef.current) {
          fpsRef.current.innerText = `${Math.round(fps)} FPS`;
        }
          setPoliceData(policeData);

        // Speedometer UI Updates
        const absSpeed = Math.abs(speed);
        const displaySpeed = Math.floor(absSpeed * 6);
        if (speedNumberRef.current) {
          speedNumberRef.current.innerText = displaySpeed.toString();
        }

        // Gauge circular bar update (radius=40, circumference ~ 251.3, half circle ~ 125.6)
        if (speedGaugeRef.current) {
          const progress = Math.min(absSpeed / maxSpeed, 1);
          const offset = 125.6 - (progress * 125.6);
          speedGaugeRef.current.style.strokeDashoffset = offset.toFixed(1);
        }
      }, (state, score) => {
        setGameOver(state);
        setFinalScore(score);
      });

      if (miniMapCanvasRef.current) {
        game.setMiniMapCanvas(miniMapCanvasRef.current);
      }

      game.start();

      return () => {
        game.dispose();
      };
    }
  }, [resetCount]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      <canvas ref={canvasRef} className="w-full h-full outline-none" />
      
      <div ref={scoreRef} className="absolute top-4 left-4 text-white font-mono text-2xl font-bold select-none drop-shadow-md z-10 pointer-events-none">
        SCORE: 0
      </div>
      <div ref={policeCountRef} className="absolute top-12 left-4 text-red-500 font-mono text-xl font-bold select-none drop-shadow-md z-10 pointer-events-none">
        POLICE: 0
      </div>
      <div ref={destroyedCountRef} className="absolute top-20 left-4 text-orange-400 font-mono text-xl font-bold select-none drop-shadow-md z-10 pointer-events-none">
        DESTROYED: 0
      </div>
      <div ref={lostCountRef} className="absolute top-28 left-4 text-gray-400 font-mono text-xl font-bold select-none drop-shadow-md z-10 pointer-events-none">
        LOST: 0
      </div>

      <div 
        ref={fpsRef} 
        id="fps-counter" 
        className="absolute top-4 left-1/2 -translate-x-1/2 text-emerald-400 font-mono text-lg font-bold select-none drop-shadow-md z-10 pointer-events-none bg-black/60 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-sm shadow-lg tracking-wider"
      >
        -- FPS
      </div>

      <div className="absolute top-4 right-4 text-red-500 font-mono text-sm select-none z-10 pointer-events-none flex flex-col items-end">
        <div className="mb-2 font-bold text-lg">POLICE UNITS</div>
        <div className="flex flex-col items-end">
          {policeData.map((p) => (
            <div key={p.id} className="mb-2 p-2 bg-black/50 border border-red-500/50 rounded flex justify-between items-center w-48">
              <span className="font-bold">CAR #{p.id}</span>
              <span className="text-white">{'❤️'.repeat(Math.max(0, p.health))}</span>
            </div>
          ))}
        </div>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20">
          <h1 className="text-6xl font-black mb-4 text-red-500 tracking-widest drop-shadow-lg">BUSTED</h1>
          <p className="text-2xl mb-8 font-mono">FINAL SCORE: {Math.floor(finalScore)}</p>
          <button 
            onClick={() => {
              setGameOver(false);
              setFinalScore(0);
              setPoliceData([]);
              setResetCount((count) => count + 1);
            }}
            className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg pointer-events-auto"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
      
      {/* Mini Map HUD in Lower Left */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none flex flex-col items-start gap-2 select-none">
        <div className="relative w-[180px] h-[180px] rounded-full p-1 bg-slate-950/85 border-2 border-slate-700/60 shadow-2xl backdrop-blur-md flex items-center justify-center overflow-hidden">
          <canvas 
            ref={miniMapCanvasRef} 
            className="w-[172px] h-[172px] rounded-full"
          />
          {/* MiniMap Title overlay badge */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 rounded-full border border-sky-500/30 text-[9px] font-mono font-bold text-sky-400 tracking-wider uppercase">
            GPS NAV
          </div>
        </div>

        {/* Controls Info badge below MiniMap */}
        <div className="text-white/60 font-mono text-xs bg-black/60 px-2.5 py-1.5 rounded-md border border-white/10 backdrop-blur-sm flex flex-col gap-0.5 shadow-lg">
          <div><span className="text-sky-400 font-bold">WASD / Arrows</span> Drive</div>
          <div><span className="text-amber-400 font-bold">R</span> Unstuck / Respawn</div>
        </div>
      </div>

      {/* High-fidelity HUD Speedometer */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-none bg-black/75 border border-white/10 rounded-2xl p-3 flex items-center justify-center backdrop-blur-md shadow-2xl">
        {/* Circular Speed Gauge */}
        <div className="relative w-24 h-24 flex flex-col items-center justify-center">
          <svg className="w-full h-full transform rotate-180">
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="60%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Background circle track (half-circle) */}
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray="125.6 251.3"
              strokeLinecap="round"
            />
            {/* Active speed-indicating circle (half-circle) */}
            <circle
              ref={speedGaugeRef}
              cx="48"
              cy="48"
              r="40"
              stroke="url(#speedGradient)"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray="125.6 251.3"
              strokeDashoffset="125.6"
              strokeLinecap="round"
              className="transition-all duration-75 ease-out"
            />
          </svg>
          {/* Numeric speed readouts inside the dial, positioned lower for a clean semi-circular look */}
          <div className="absolute bottom-3 flex flex-col items-center justify-center">
            <span ref={speedNumberRef} className="text-3xl font-extrabold text-white font-mono tracking-tight leading-none">
              0
            </span>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 leading-none">
              MPH
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
