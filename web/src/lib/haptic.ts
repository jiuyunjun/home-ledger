// Tiny wrapper around navigator.vibrate. No-op on iOS Safari (which ignores
// the Vibration API) and unsupported platforms — calling it is always safe.
export function haptic(pattern: number | number[] = 10) {
  if (typeof window === 'undefined') return;
  try { window.navigator.vibrate?.(pattern); } catch {}
}

// Common patterns
export const hapticTap = () => haptic(8);
export const hapticSuccess = () => haptic([12, 40, 18]);
export const hapticWarn = () => haptic([20, 60, 20]);
