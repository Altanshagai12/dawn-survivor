// 256px VFX cells: revolver 5, shotgun 6, crossbow 3, flame 4.
// Conservative ADD-visible envelope around skinProjectileAnchor, including
// pixel corners. Reproduced from the shipped pixels by skin-projectile-bounds.test.js.
// Presentation-only: physics must never import these measurements.
const WEAPON_IDS = ['revolver', 'shotgun', 'crossbow', 'flame'];
const ENVELOPES = {
  'shana-astral-warden': [111, 138, 123, 132],
  'diamond-bloodmoon-regent': [135, 145, 127, 157],
  'scarlett-sunforge-phoenix': [130, 173, 161, 129],
  'hina-void-lotus': [135, 135, 124, 131],
  'shana-celestial-dragon-sovereign': [126, 146, 137, 142],
  'diamond-obsidian-eclipse-valkyrie': [161, 152, 130, 162],
  'scarlett-prismatic-tempest-seraph': [132, 171, 153, 137],
  'hina-nine-tail-chrono-kitsune': [136, 144, 135, 136],
};

export function skinProjectileEnvelope(skin, weaponId) {
  const index = WEAPON_IDS.indexOf(weaponId);
  return Object.hasOwn(ENVELOPES, skin?.id) && ENVELOPES[skin.id][index] || 256 * Math.SQRT2;
}
