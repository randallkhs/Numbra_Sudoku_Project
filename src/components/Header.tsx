import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Difficulty } from '../lib/sudoku';
import { cn } from '../lib/utils';
import { Volume2, VolumeX, Vibrate, VibrateOff, Settings, X, Palette, BarChart2, Sparkles, User, LogOut } from 'lucide-react';
import { auth, loginWithGoogle, logoutUser } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function Header() {
  const { mistakes, timeElapsed, difficulty, startNewGame, isPlaying, isPaused, tickTimer, toggleStats } = useGameStore();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isPaused) {
      interval = setInterval(() => {
        tickTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isPaused, tickTimer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 w-full max-w-[400px] mx-auto pt-8 px-4 pb-2"
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-light tracking-[2px] uppercase text-game-text-primary m-0">
              Numbra
            </h1>
            <div className="flex items-center gap-1">
              <button 
                onClick={toggleStats}
                className="w-8 h-8 rounded-full flex items-center justify-center text-game-text-secondary hover:text-game-text-primary hover:bg-game-surface transition-colors focus:outline-none"
                title="Current Stats"
              >
                <BarChart2 size={18} />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-game-text-secondary hover:text-game-text-primary hover:bg-game-surface transition-colors focus:outline-none"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-game-text-secondary uppercase tracking-[1px]">Mistakes</span>
              <span className={cn(mistakes >= 3 ? "text-game-error" : "text-game-text-primary")}>{mistakes}/3</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-game-text-secondary uppercase tracking-[1px]">Time</span>
              <span className="text-game-text-primary tabular-nums">{formatTime(timeElapsed)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between bg-game-surface p-1 rounded-[20px] border border-game-border backdrop-blur-md">
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => startNewGame(d)}
              className={cn(
                "flex-1 text-xs py-2 rounded-[16px] uppercase tracking-wider font-semibold transition-all duration-300",
                difficulty === d 
                  ? "bg-gradient-to-r from-game-accent-start to-game-accent-end text-white shadow-[0_10px_25px_var(--color-game-accent-start)] scale-100" 
                  : "text-game-text-secondary hover:text-game-text-primary scale-95 hover:bg-game-surface-hover"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </motion.header>

      <AnimatePresence>
        {showSettings && (
          <SettingsMenu key="settings" onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function SettingsMenu({ onClose, key }: { onClose: () => void, key?: string | number }) {
    const { soundEnabled, toggleSound, hapticsEnabled, toggleHaptics, hapticIntensity, setHapticIntensity, theme, setTheme } = useGameStore();

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  const themes: { id: any, name: string, colors: string }[] = [
    { id: 'cosmic', name: 'Cosmic', colors: 'from-[#0d0d12] to-[#4f46e5]' },
    { id: 'cyber', name: 'Cyber', colors: 'from-[#050a0a] to-[#ff00ff]' },
    { id: 'paper', name: 'Paper', colors: 'from-[#fdfdfc] to-[#ef4444]' },
    { id: 'neon', name: 'Neon', colors: 'from-[#1a002a] to-[#ff007f]' },
    { id: 'glitch', name: 'Glitch', colors: 'from-[#000000] to-[#ff003c]' },
    { id: 'disco', name: 'Disco', colors: 'from-[#230046] to-[#00ffaa]' },
    { id: 'mechanic', name: 'Mechanic', colors: 'from-[#1c1c1c] to-[#ff4500]' },
    { id: 'cartoon', name: 'Cartoon', colors: 'from-[#fff176] to-[#e91e63]' },
  ];

  return (
    <motion.div 
      key={key}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="absolute top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-black/80 backdrop-blur-xl border border-game-border shadow-2xl rounded-3xl p-6 z-50 flex flex-col gap-6"
    >
      <div className="flex justify-between items-center border-b border-game-border pb-4">
        <h3 className="text-lg font-medium tracking-wide text-white flex items-center gap-2">
          <Settings size={20} className="text-game-accent-light" />
          Settings
        </h3>
        <button onClick={onClose} className="rounded-full p-2 bg-game-surface hover:bg-game-surface-hover text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {!user ? (
        <div className="flex flex-col gap-2 items-center text-center p-3 rounded-2xl bg-game-surface border border-game-border">
          <User size={24} className="text-game-text-secondary" />
          <p className="text-xs text-game-text-secondary font-medium px-2">Login to backup your game state and themes across sessions.</p>
          <button 
            onClick={loginWithGoogle}
            className="mt-1 w-full bg-white text-black py-2 rounded-xl text-xs font-bold font-sans uppercase tracking-wider hover:bg-gray-100 transition-colors"
          >
            Google Login
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-game-surface border border-game-border">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src={user.photoURL || ''} alt="avatar" className="w-8 h-8 rounded-full bg-gray-800" />
            <div className="flex flex-col max-w-[150px]">
              <span className="text-xs font-bold text-white truncate">{user.displayName}</span>
              <span className="text-[10px] text-game-text-secondary truncate">{user.email}</span>
            </div>
          </div>
          <button 
            onClick={logoutUser}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-game-surface-hover text-game-text-secondary hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-200">Sound Effects</span>
          <button 
            onClick={toggleSound}
            className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg", soundEnabled ? "bg-game-accent-start text-white" : "bg-game-surface text-gray-400")}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-200">Haptics (Vibration)</span>
            <button 
              onClick={toggleHaptics}
              className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg", hapticsEnabled ? "bg-game-accent-start text-white" : "bg-game-surface text-gray-400")}
            >
              {hapticsEnabled ? <Vibrate size={20} /> : <VibrateOff size={20} />}
            </button>
          </div>
          
          <AnimatePresence>
            {hapticsEnabled && (
              <motion.div 
                key="haptic-intensity-menu"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 overflow-hidden justify-end"
              >
                {(['low', 'medium', 'high'] as const).map(intensity => (
                  <button
                    key={intensity}
                    onClick={() => setHapticIntensity(intensity)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors border",
                      hapticIntensity === intensity 
                        ? "bg-game-surface-hover text-white border-game-accent-start" 
                        : "bg-transparent text-game-text-secondary border-game-border hover:text-white"
                    )}
                  >
                    {intensity}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-game-border">
        <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
          <Palette size={16} className="text-game-accent-light" /> Themes
        </span>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "py-3 px-4 rounded-2xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all border",
                theme === t.id ? "bg-game-surface border-game-accent-start shadow-[0_0_15px_var(--color-game-accent-subtle)] text-white" : "bg-transparent border-game-border text-gray-400 hover:text-white"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", t.colors)} />
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
