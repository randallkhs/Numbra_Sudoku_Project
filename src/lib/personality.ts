export type PersonalityEventType =
  | 'pattern-detected'
  | 'clean-logic'
  | 'row-secured'
  | 'column-secured'
  | 'box-secured'
  | 'flow-protected'
  | 'focus-streak'
  | 'comeback'
  | 'numbra-alignment';

export type PersonalityTone = 'standard' | 'calm' | 'playful';

export interface PersonalityEvent {
  id: string;
  type: PersonalityEventType;
  priority: 'low' | 'medium' | 'high';
  messageKey: string;
  createdAt: number;
  expiresAt: number;
  context?: Record<string, string | number>;
}

export interface GameplayEventContext {
  consecutiveCorrectPlayerMoves: number;
  correctMovesSinceLastError: number;
  hasUnprotectedErrorSinceLastComeback: boolean;
  rowComplete: boolean;
  colComplete: boolean;
  blockComplete: boolean;
  completedUnitsCount: number; // number of units completed by this move (e.g. 2 or more means numbra-alignment)
  reachedNumbraMode: boolean; // whether they just crossed into combo >= 8 from < 8
  isNakedSingle: boolean; // whether cell had exactly 1 option before
  isUnitAlmostComplete: boolean; // e.g. completed count is 8 of 9 cells
  isShieldAbsorbed?: boolean; // whether mistake was absorbed by the shield
}

// Map event types to their priority
export const EVENT_PRIORITY: Record<PersonalityEventType, 'low' | 'medium' | 'high'> = {
  'numbra-alignment': 'high',
  'comeback': 'high',
  'flow-protected': 'high',
  'clean-logic': 'medium',
  'focus-streak': 'medium',
  'row-secured': 'low',
  'column-secured': 'low',
  'box-secured': 'low',
  'pattern-detected': 'low',
};

// Message Catalog
export const PERSONALITY_MESSAGES: Record<PersonalityTone, Record<PersonalityEventType, string[]>> = {
  standard: {
    'pattern-detected': ['Pattern detected', 'Calculated placement', 'Symmetrical resolve'],
    'clean-logic': ['Clean logic', 'Precise connection', 'Methodical solution'],
    'row-secured': ['Row secured', 'Horizontal alignment Complete', 'Row unified'],
    'column-secured': ['Column secured', 'Vertical alignment Complete', 'Column unified'],
    'box-secured': ['Box secured', 'Sub-grid Complete', 'Sub-grid unified'],
    'flow-protected': ['Flow protected', 'Mistake absorbed', 'Shield held'],
    'focus-streak': ['Focus holding', 'Unbroken sequence', 'Steady momentum'],
    'comeback': ['Back in alignment', 'Recovery established', 'Logic restored'],
    'numbra-alignment': ['Numbra alignment', 'Harmonic convergence', 'Dual sweep aligned'],
  },
  calm: {
    'pattern-detected': ['Harmony observed', 'A path clears', 'Gentle understanding'],
    'clean-logic': ['Peaceful flow', 'Quiet clarity', 'Logic breathing'],
    'row-secured': ['A row settled', 'Horizontal rest', 'Row of peace'],
    'column-secured': ['A column settled', 'Vertical rest', 'Column of peace'],
    'box-secured': ['A box aligned', 'Grid centering', 'Sub-grid settled'],
    'flow-protected': ['Flow protected', 'Shield absorbed the ripple'],
    'focus-streak': ['Steady presence', 'Calm continuity', 'Mindful focus'],
    'comeback': ['Gently back in alignment', 'Quiet return'],
    'numbra-alignment': ['Gentle resonance', 'Harmonic sync', 'Symmetrical flow'],
  },
  playful: {
    'pattern-detected': ['I see what you did there!', 'Calculated! No luck involved.', 'Absolute galaxy brain!'],
    'clean-logic': ['No hints, pure genius!', 'Look at that clean play!', 'Cooking with absolute logic!'],
    'row-secured': ['Boom! Row done.', 'Row locked down!', 'Row complete, and it is glorious!'],
    'column-secured': ['Boom! Column complete.', 'Column locked down!', 'Vertical supremacy established!'],
    'box-secured': ['Box captured!', 'Box locked down!', 'Grid sector secured!'],
    'flow-protected': ['Saved by the shield!', 'Shield saved your streak!', 'Oops! Handled.'],
    'focus-streak': ['Look at you go!', 'On a certified hot streak!', 'Can anyone stop them?!'],
    'comeback': ['And we are back!', 'The comeback is real!', 'Mistake forgotten. Let us ride.'],
    'numbra-alignment': ['Numbra combo multiplier!', 'Cosmic scale sync!', 'Multi-lane completion! BOOM!'],
  }
};

/**
 * Evaluates whether a custom game event triggers a personality notification.
 * Returns the event type to trigger, or null if no event triggered.
 */
export function getTriggeredPersonalityEvent(
  source: 'player' | 'hint',
  isError: boolean,
  context: GameplayEventContext,
  tone: PersonalityTone = 'standard'
): PersonalityEventType | null {
  // Never praise hints or errors, except for Mistake Shield absorption which is a specialized event
  if (isError) {
    // Only Mistake Shield absorption triggers "flow-protected"
    if (context.isShieldAbsorbed) {
      return 'flow-protected';
    }
    return null;
  }

  if (source === 'hint') {
    return null;
  }

  // Check priorities from highest to lowest:

  // High Priority:
  // 1. Numbra alignment (multi-sweep or reached Numbra mode)
  if (context.completedUnitsCount >= 2 || context.reachedNumbraMode) {
    return 'numbra-alignment';
  }

  // 2. Comeback (after unprotected error, 3 correct moves)
  if (context.hasUnprotectedErrorSinceLastComeback && context.correctMovesSinceLastError === 3) {
    if (tone === 'calm') {
      // Calmer tones suppress/reduce comeback displays
      return null;
    }
    return 'comeback';
  }

  // Medium Priority:
  // 3. Focus streak (consecutive correct player moves reaches 5 or 8)
  if (context.consecutiveCorrectPlayerMoves === 5 || context.consecutiveCorrectPlayerMoves === 8) {
    return 'focus-streak';
  }

  // 4. Clean logic (3 consecutive core player moves)
  if (context.consecutiveCorrectPlayerMoves === 3) {
    return 'clean-logic';
  }

  // Low Priority:
  // 5. Unit completions (box-secured, column-secured, row-secured)
  if (context.rowComplete) {
    return 'row-secured';
  }
  if (context.colComplete) {
    return 'column-secured';
  }
  if (context.blockComplete) {
    return 'box-secured';
  }

  // 6. Pattern-detected (Naked single or completing a unit up to 8 of 9)
  if (context.isNakedSingle || context.isUnitAlmostComplete) {
    return 'pattern-detected';
  }

  return null;
}

/**
 * Gets a random message string based on Tone and Event Type.
 */
export function getPersonalityMessage(tone: PersonalityTone, type: PersonalityEventType): string {
  const list = PERSONALITY_MESSAGES[tone][type];
  if (!list || list.length === 0) {
    // Fallback to standard
    const fallbackList = PERSONALITY_MESSAGES['standard'][type];
    return fallbackList[Math.floor(Math.random() * fallbackList.length)];
  }
  return list[Math.floor(Math.random() * list.length)];
}
