import { useEffect, useRef, useState } from 'react';
import { Game } from './Game';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const policeCountRef = useRef<HTMLDivElement>(null);
  const destroyedCountRef = useRef<HTMLDivElement>(null);
  const policeListRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (canvasRef.current) {
      const game = new Game(canvasRef.current, (score, policeCount, destroyedCount, policeData) => {
        if (scoreRef.current) {
          scoreRef.current.innerText = `SCORE: ${Math.floor(score)}`;
        }
        if (policeCountRef.current) {
          policeCountRef.current.innerText = `POLICE: ${policeCount}`;
        }
        if (destroyedCountRef.current) {
          destroyedCountRef.current.innerText = `DESTROYED: ${destroyedCount}`;
        }
        if (policeListRef.current) {
          policeListRef.current.innerHTML = policeData.map(p => 
            `<div class="mb-2 p-2 bg-black/50 border border-red-500/50 rounded flex justify-between items-center w-48">
              <span class="font-bold">CAR #${p.id}</span>
              <span class="text-white">${'❤️'.repeat(Math.max(0, p.health))}</span>
            </div>`
          ).join('');
        }
      }, (state, score) => {
        setGameOver(state);
        setFinalScore(score);
      });
      game.start();

      return () => {
        game.dispose();
      };
    }
  }, []);

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

      <div className="absolute top-4 right-4 text-red-500 font-mono text-sm select-none z-10 pointer-events-none flex flex-col items-end">
        <div className="mb-2 font-bold text-lg">POLICE UNITS</div>
        <div ref={policeListRef} className="flex flex-col items-end">
        </div>
      </div>

      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20">
          <h1 className="text-6xl font-black mb-4 text-red-500 tracking-widest drop-shadow-lg">BUSTED</h1>
          <p className="text-2xl mb-8 font-mono">FINAL SCORE: {Math.floor(finalScore)}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg pointer-events-auto"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 text-white/50 font-mono text-sm pointer-events-none">
        Controls: WASD or Arrow Keys
      </div>
    </div>
  );
}
