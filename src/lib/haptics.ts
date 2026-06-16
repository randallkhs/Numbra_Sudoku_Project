type HapticIntensity = 'low' | 'medium' | 'high';

const IOS_SWITCH_ID = '__ios_haptic_switch__';

function isLikelyIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getOrCreateIOSHapticSwitch(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(IOS_SWITCH_ID) as HTMLInputElement | null;
  if (el) return el;
  el = document.createElement('input');
  el.id = IOS_SWITCH_ID;
  el.type = 'checkbox';
  // Safari-only attribute that renders checkbox as a native iOS switch.
  // TypeScript/React may not know about it, so set it as a raw attribute.
  el.setAttribute('switch', '');
  // Keep it in the DOM but visually offscreen.
  // Do NOT use display:none because native control behavior may not fire.
  el.setAttribute('aria-hidden', 'true');
  el.tabIndex = -1;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '-9999px';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  return el;
}

let lastIOSFallbackAt = 0;

function triggerIOSSwitchHapticFallback(): void {
  if (!isLikelyIOS()) return;
  if (typeof document === 'undefined') return;
  
  const now = Date.now();
  // Avoid spamming the hidden switch during animations/scans.
  if (now - lastIOSFallbackAt < 45) return;
  lastIOSFallbackAt = now;
  
  try {
    const el = getOrCreateIOSHapticSwitch();
    if (!el) return;
    // Toggle state before clicking so the native switch has a state change.
    el.checked = !el.checked;
    el.click();
  } catch {
    // Best-effort only. Never break the game.
  }
}

export const haptic = {
  enabled: true,
  intensity: 'medium' as HapticIntensity,
  
  getScale: () => {
    switch (haptic.intensity) {
      case 'low': return 0.5;
      case 'high': return 2.0;
      default: return 1.0;
    }
  },

  vibrateScaled: (val: number | number[]) => {
    if (!haptic.enabled || typeof navigator === 'undefined') return;
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        const scale = haptic.getScale();
        if (Array.isArray(val)) {
          navigator.vibrate(val.map(v => Math.max(1, Math.round(v * scale))));
        } else {
          navigator.vibrate(Math.max(1, Math.round(val * scale)));
        }
        return;
      }
      
      // iPhone Safari fallback.
      // This only produces a single subtle tap on supported iOS/Safari versions.
      triggerIOSSwitchHapticFallback();
    } catch {
      // Ignore all haptic failures.
    }
  },

  light: () => haptic.vibrateScaled(10),
  medium: () => haptic.vibrateScaled(15),
  heavy: () => haptic.vibrateScaled(25),
  success: () => haptic.vibrateScaled([15, 30, 20, 30, 15]),
  error: () => haptic.vibrateScaled([40, 30, 40])
};


