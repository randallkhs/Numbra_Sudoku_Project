export const haptic = {
  enabled: true,
  light: (difficulty: string = 'easy') => {
    try {
      if (haptic.enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        let amt = 10;
        if(difficulty === 'medium') amt = 15;
        if(difficulty === 'hard') amt = 20;
        if(difficulty === 'expert') amt = 30;
        navigator.vibrate(amt);
      }
    } catch (e) {}
  },
  medium: (difficulty: string = 'easy') => {
    try {
      if (haptic.enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        let amt = 20;
        if(difficulty === 'medium') amt = 30;
        if(difficulty === 'hard') amt = 40;
        if(difficulty === 'expert') amt = 60;
        navigator.vibrate(amt);
      }
    } catch (e) {}
  },
  heavy: (difficulty: string = 'easy') => {
    try {
      if (haptic.enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        let amt = 30;
        if(difficulty === 'medium') amt = 45;
        if(difficulty === 'hard') amt = 60;
        if(difficulty === 'expert') amt = 90;
        navigator.vibrate(amt);
      }
    } catch (e) {}
  },
  success: () => {
    try {
      if (haptic.enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 50, 30, 50, 40]);
      }
    } catch (e) {}
  },
  error: () => {
    try {
      if (haptic.enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30, 40, 40]);
      }
    } catch (e) {}
  }
};

