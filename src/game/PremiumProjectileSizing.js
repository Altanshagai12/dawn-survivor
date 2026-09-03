import { projectileCollisionRadius } from './ProjectileGeometry.js?build=20260903c';
import { skinProjectileEnvelope } from '../data/skinProjectileBounds.js?build=20260903b';

// Frozen pre-parity presentation (fb2dc15). Never use these values for physics.
const ORIGINAL_SCALES = Object.freeze({ revolver: .19, shotgun: .1, crossbow: .33, flame: .23 });

export function premiumProjectileScale(size = 8, weaponId = 'revolver', skin = null, powerScale = 1) {
  const original = (ORIGINAL_SCALES[weaponId] ?? ORIGINAL_SCALES.revolver)
    * Math.max(.72, size / 8) * powerScale * 1.65;
  // Freeze the tight 19a7bed reference too: changing gameplay radius must not
  // move the requested arithmetic midpoint of the two released art sizes.
  const tight = size / (2 * skinProjectileEnvelope(skin, weaponId));
  return (original + tight) / 2;
}

export function premiumProjectileCoreScale(size = 8, weaponId = 'revolver', skin = null) {
  return projectileCollisionRadius(size) / skinProjectileEnvelope(skin, weaponId);
}
