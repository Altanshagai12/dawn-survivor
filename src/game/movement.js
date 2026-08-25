export const FIRING_MOVE_MULTIPLIER = .78;

export function movementMultiplier(firing, hasRunAndGun = false) {
  return firing && !hasRunAndGun ? FIRING_MOVE_MULTIPLIER : 1;
}
