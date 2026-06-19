import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store/gameStore';
import { Sparkles, MessageCircle, AlertCircle, Zap } from 'lucide-react';

export function PersonalityOverlay() {
  const queue = useGameStore(state => state.personalityQueue);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const motionProps = (priority: 'low' | 'medium' | 'high') => {
    if (reducedMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 }
      };
    }
    return {
      initial: { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -12 },
      transition: { type: 'spring', stiffness: 260, damping: 22 }
    };
  };

  const getEventIcon = (priority: 'low' | 'medium' | 'high', type: string) => {
    if (priority === 'high') {
      return <Zap className="w-4 h-4 text-game-accent-light shrink-0" />;
    }
    if (priority === 'medium') {
      return <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (type.includes('error') || type.includes('complain')) {
      return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
    }
    return <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />;
  };

  const getPriorityStyle = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'border-game-accent-start/30 bg-game-accent-subtle/90 text-game-text-primary shadow-lg shadow-game-accent-start/10';
      case 'medium':
        return 'border-purple-500/20 bg-purple-950/80 text-game-text-primary shadow-md';
      case 'low':
      default:
        return 'border-white/10 bg-black/85 text-game-text-secondary';
    }
  };

  return (
    <div
      className="absolute bottom-[12%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-30 w-[92%] max-w-[340px]"
      aria-live="polite"
      role="status"
    >
      <AnimatePresence initial={false}>
        {queue.map((event) => (
          <motion.div
            key={event.id}
            {...motionProps(event.priority)}
            className={`w-full pointer-events-none flex items-center gap-3 border px-4 py-2.5 rounded-[16px] backdrop-blur-md transition-colors duration-200 ${getPriorityStyle(
              event.priority
            )}`}
          >
            {getEventIcon(event.priority, event.type)}
            <p className="text-[12px] font-medium leading-relaxed m-0 tracking-normal flex-1">
              {event.messageKey}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
