export const haptic = {
  enabled: true,
  intensity: 'medium' as 'low' | 'medium' | 'high',
  
  getScale: () => {
    switch(haptic.intensity) {
      case 'low': return 0.5;
      case 'high': return 2.0;
      default: return 1.0;
    }
  },

  vibrateScaled: (val: number | number[]) => {
    if (!haptic.enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      const scale = haptic.getScale();
      if (Array.isArray(val)) {
        navigator.vibrate(val.map(v => Math.max(1, Math.round(v * scale))));
      } else {
        navigator.vibrate(Math.max(1, Math.round(val * scale)));
      }
    } catch(e) {}
  },

  // Premium subtle pulses
  light: () => haptic.vibrateScaled(10),
  medium: () => haptic.vibrateScaled(15),
  heavy: () => haptic.vibrateScaled(25),
  success: () => haptic.vibrateScaled([15, 30, 20, 30, 15]),
  error: () => haptic.vibrateScaled([40, 30, 40])
};


