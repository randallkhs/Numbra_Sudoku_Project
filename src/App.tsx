/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { NumberPad } from './components/NumberPad';
import { Header } from './components/Header';
import { SurpriseOverlay } from './components/SurpriseOverlay';
import { Confetti } from './components/Confetti';
import { StatsModal } from './components/StatsModal';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

import { loadSnarks, saveSnark, getRandomSnark } from './lib/aiCache';

export default function App() {
  const startNewGame = useGameStore(state => state.startNewGame);
  const loadSavedGameOrStartNew = useGameStore(state => state.loadSavedGameOrStartNew);
  const inputNumber = useGameStore(state => state.inputNumber);
  const isPlaying = useGameStore(state => state.isPlaying);
  const isPaused = useGameStore(state => state.isPaused);
  const selectedCell = useGameStore(state => state.selectedCell);
  const selectCell = useGameStore(state => state.selectCell);
  const eraseCell = useGameStore(state => state.eraseCell);
  const difficulty = useGameStore(state => state.difficulty);
  const board = useGameStore(state => state.board);
  const theme = useGameStore(state => state.theme);
  const aiEnabled = useGameStore(state => state.aiEnabled);

  useEffect(() => {
    // Apply the theme to the root element so CSS variables cascade properly for everything including modals/absolute positioned elements
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  // Idle timer for AI Snark
  useEffect(() => {
    if (!isPlaying || isPaused || !aiEnabled) return;

    const idleTimer = setTimeout(() => {
      const snarks = loadSnarks();
      const useLocal = snarks.length > 3 && Math.random() < 0.6;
      
      if (useLocal) {
        const text = getRandomSnark();
        if (text) {
          useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
          return;
        }
      }
      
      fetch('/api/ai/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: "El jugador lleva demasiado tiempo mirando el tablero sin hacer nada. Haz un comentario burlón, cómico y exagerado sobre su lentitud, como si tú te estuvieras aburriendo o durmiendo. Usa analogías graciosas o refranes.", 
          context: { difficulty, theme } 
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.text) {
          saveSnark(data.text);
          useGameStore.setState({ lastSurprise: `ai_snark:${data.text}` });
        } else if (data.error && snarks.length > 0) {
          const text = getRandomSnark();
          if (text) useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
        }
      })
      .catch((err) => {
          console.log(err);
          const text = getRandomSnark();
          if (text) useGameStore.setState({ lastSurprise: `ai_snark:${text}` });
      });
    }, 25000); // 25 seconds idle

    return () => clearTimeout(idleTimer);
  }, [isPlaying, isPaused, difficulty, board, selectedCell, theme, aiEnabled]);

  useEffect(() => {
    if (!isPlaying) {
      loadSavedGameOrStartNew();
    }
  }, [isPlaying, loadSavedGameOrStartNew]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused) return;

      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 9) {
        inputNumber(num);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        eraseCell();
      } else if (selectedCell && e.key.startsWith('Arrow')) {
        let [r, c] = selectedCell;
        if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
        if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
        if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
        if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
        selectCell(r, c);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isPaused, inputNumber, eraseCell, selectedCell, selectCell]);

  return (
    <div className={cn(
      "fixed inset-0 flex justify-center font-sans overflow-hidden transition-colors duration-700",
      `theme-${theme}`,
      "bg-gradient-to-b from-game-bg-start to-game-bg-end text-game-text-primary"
    )}>
      {/* Background glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-game-accent-start/10 rounded-full blur-[120px] pointer-events-none transition-colors duration-700" />
      
      <div className={cn(
        "relative w-full max-w-md h-[100dvh] flex flex-col justify-between overflow-hidden",
        isPaused && "opacity-50 blur-sm transition-all duration-500"
      )}>
        <Header />
        
        <div className="flex-1 flex flex-col justify-center gap-6 relative">
          <Confetti />
          <Board />
          <Controls />
        </div>

        <NumberPad />
      </div>

      <SurpriseOverlay />
      <StatsModal />

      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none text-3xl font-light tracking-widest text-game-text-secondary mix-blend-difference"
          >
            PAUSED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

