/**
 * Web Vibration API helper tailored for neurodivergent sensory feedback.
 * Provides soft, predictable tactile cues without startling vibrations.
 */

export function triggerSoftHaptic(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(25);
    } catch {
      // Ignored if user hasn't interacted or permission denied
    }
  }
}

export function triggerSuccessHaptic(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([35, 50, 60]);
    } catch {
      // Ignored
    }
  }
}

export function triggerCelebrationHaptic(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40, 30, 40, 30, 80]);
    } catch {
      // Ignored
    }
  }
}

export function triggerCalmHaptic(): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([80, 120, 80]);
    } catch {
      // Ignored
    }
  }
}
