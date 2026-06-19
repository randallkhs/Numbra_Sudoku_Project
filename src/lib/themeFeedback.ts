import { ThemeType } from '../store/gameStore';

export interface ThemeFeedbackProfile {
  id: ThemeType;
  visualVariant: string;
  correctEffect: string;
  errorEffect: string;
  completionEffect: string;
  shieldEffect: string;
  audioPreset: string;
  ambientPreset: string;
  hapticPreset: string;
  personalityTone: 'standard' | 'calm' | 'playful';
  intensity: 'subtle' | 'medium' | 'expressive';
}

export const THEME_FEEDBACK_PROFILES: Record<ThemeType, ThemeFeedbackProfile> = {
  cosmic: {
    id: 'cosmic',
    visualVariant: 'cosmic',
    correctEffect: 'orbital glow ring',
    errorEffect: 'collapsing red-violet orbit',
    completionEffect: 'soft stardust sweep',
    shieldEffect: 'spherical energy shell',
    audioPreset: 'airy glass/chime',
    ambientPreset: 'slow low-frequency space pad',
    hapticPreset: 'standard',
    personalityTone: 'standard',
    intensity: 'expressive',
  },
  cyber: {
    id: 'cyber',
    visualVariant: 'cyber',
    correctEffect: 'fast scanline lock-on',
    errorEffect: 'chromatic glitch and horizontal interference',
    completionEffect: 'digital grid sweep',
    shieldEffect: 'firewall hex pulse',
    audioPreset: 'precise digital ticks',
    ambientPreset: 'quiet electronic hum',
    hapticPreset: 'cyber',
    personalityTone: 'standard',
    intensity: 'expressive',
  },
  paper: {
    id: 'paper',
    visualVariant: 'paper',
    correctEffect: 'subtle ink-settle bloom',
    errorEffect: 'small dry-brush or ink-feather effect',
    completionEffect: 'ink wash across the unit',
    shieldEffect: 'circular stamped seal',
    audioPreset: 'muted paper/pencil taps',
    ambientPreset: 'nearly silent soft room texture',
    hapticPreset: 'soft',
    personalityTone: 'calm',
    intensity: 'subtle',
  },
  mechanic: {
    id: 'mechanic',
    visualVariant: 'mechanic',
    correctEffect: 'calibrated gear tick',
    errorEffect: 'brief mechanical recoil',
    completionEffect: 'synchronized metal sweep',
    shieldEffect: 'interlocking ring/gear lock',
    audioPreset: 'metallic clicks and soft impacts',
    ambientPreset: 'low machine-room resonance',
    hapticPreset: 'firm',
    personalityTone: 'standard',
    intensity: 'medium',
  },
  neon: {
    id: 'neon',
    visualVariant: 'neon',
    correctEffect: 'electric trace',
    errorEffect: 'unstable hum & power pop',
    completionEffect: 'controlled glow pulses',
    shieldEffect: 'dual voltage spark gap',
    audioPreset: 'synthesized electric pops',
    ambientPreset: 'warm neon hum',
    hapticPreset: 'standard',
    personalityTone: 'standard',
    intensity: 'expressive',
  },
  glitch: {
    id: 'glitch',
    visualVariant: 'glitch',
    correctEffect: 'pixel displacement',
    errorEffect: 'intense data-tear noise burst',
    completionEffect: 'sub-frame trace sweep',
    shieldEffect: 'temporary decryption firewall',
    audioPreset: 'fuzz static and logic glitch',
    ambientPreset: 'fractured digital hum',
    hapticPreset: 'glitch-buzz',
    personalityTone: 'playful',
    intensity: 'expressive',
  },
  disco: {
    id: 'disco',
    visualVariant: 'disco',
    correctEffect: 'restrained prism ripple',
    errorEffect: 'descending synth buzz & sweep',
    completionEffect: 'rhythmic sparkle',
    shieldEffect: 'mirrored disco ball flare',
    audioPreset: 'fm brass stab & retro bells',
    ambientPreset: 'rhythmic low disco bass groove',
    hapticPreset: 'bouncy',
    personalityTone: 'playful',
    intensity: 'expressive',
  },
  cartoon: {
    id: 'cartoon',
    visualVariant: 'cartoon',
    correctEffect: 'tasteful squash-and-settle',
    errorEffect: 'wobbly dramatic scale-back',
    completionEffect: 'staggered visual pop explosion',
    shieldEffect: 'bouncy rubber cushion',
    audioPreset: 'marimba bonk & slide whistle',
    ambientPreset: 'soft organic clockwork tick',
    hapticPreset: 'soft-bouncy',
    personalityTone: 'playful',
    intensity: 'expressive',
  }
};

/**
 * Returns the theme feedback profile for a given ThemeType.
 * Safely falls back to 'cosmic' if the theme is invalid or unrecognized.
 */
export function getThemeFeedbackProfile(theme: ThemeType): ThemeFeedbackProfile {
  if (THEME_FEEDBACK_PROFILES[theme]) {
    return THEME_FEEDBACK_PROFILES[theme];
  }
  return THEME_FEEDBACK_PROFILES.cosmic;
}
