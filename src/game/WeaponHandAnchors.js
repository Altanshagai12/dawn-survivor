// Empty-fist centers calibrated on the weaponless 6-column / 8-direction edits.
// Keep imported edits on this same grid: an anchor belongs to the displayed frame,
// not the aim vector (which can rotate continuously between body directions).
const HANDS = Object.freeze({
  shana: { width: 181, height: 181, rows: [
    [[127, 109], [124, 109], [116, 109], [113, 109], [109, 109], [114, 109]],
    [[114, 86], [117, 89], [112, 88], [103, 88], [107, 88], [108, 88]],
    [[117, 80], [119, 77], [119, 78], [112, 81], [111, 79], [115, 78]],
    [[132, 78], [126, 80], [125, 82], [112, 80], [108, 79], [116, 81]],
    [[113, 82], [113, 82], [107, 82], [105, 82], [104, 82], [103, 82]],
    [[49, 86], [54, 85], [40, 85], [37, 85], [34, 86], [32, 85]],
    [[47, 88], [41, 89], [41, 89], [36, 89], [36, 89], [42, 89]],
    [[50, 76], [45, 76], [44, 76], [38, 76], [40, 76], [43, 76]],
  ] },
  diamond: { width: 222, height: 148, rows: [
    [[148, 71], [156, 72], [155, 72], [150, 70], [149, 72], [154, 71]],
    [[147, 80], [146, 80], [146, 79], [149, 79], [144, 80], [149, 80]],
    [[139, 75], [138, 76], [136, 75], [137, 75], [142, 75], [142, 75]],
    [[147, 82], [145, 82], [147, 81], [147, 81], [146, 82], [145, 82]],
    [[110, 83], [113, 83], [115, 83], [118, 83], [118, 83], [114, 83]],
    [[80, 83], [81, 83], [81, 83], [81, 83], [80, 83], [79, 83]],
    [[79, 85], [79, 85], [81, 85], [80, 85], [81, 85], [79, 85]],
    [[80, 80], [81, 80], [79, 81], [83, 80], [82, 80], [81, 80]],
  ] },
  scarlett: { width: 181, height: 181, rows: [
    [[136, 85], [138, 85], [139, 85], [138, 85], [137, 85], [139, 85]],
    [[124, 105], [122, 105], [125, 105], [120, 104], [122, 104], [122, 104]],
    [[120, 98], [120, 98], [125, 97], [120, 97], [122, 95], [122, 97]],
    [[129, 101], [125, 97], [129, 98], [128, 97], [126, 95], [125, 96]],
    [[110, 90], [109, 90], [107, 90], [106, 90], [104, 90], [110, 90]],
    [[67, 94], [66, 94], [71, 94], [64, 97], [67, 94], [72, 98]],
    [[134, 83], [131, 83], [132, 83], [130, 83], [128, 83], [125, 83]],
    [[136, 83], [133, 83], [133, 83], [132, 83], [132, 83], [126, 83]],
  ] },
  hina: { width: 181, height: 181, rows: [
    [[140, 96], [140, 96], [142, 96], [141, 96], [139, 103], [145, 103]],
    [[135, 97], [136, 99], [139, 98], [137, 94], [131, 93], [136, 98]],
    [[137, 101], [139, 105], [139, 97], [141, 100], [136, 101], [141, 101]],
    [[136, 101], [138, 101], [131, 101], [133, 101], [133, 98], [138, 101]],
    [[137, 112], [140, 112], [139, 112], [141, 112], [140, 112], [140, 112]],
    [[130, 93], [134, 93], [138, 93], [135, 95], [137, 95], [137, 94]],
    [[135, 93], [139, 96], [139, 96], [139, 96], [140, 95], [141, 96]],
    [[135, 97], [140, 99], [139, 97], [140, 97], [140, 97], [142, 99]],
  ] },
});

// Each normalized point is the rear hand's grip, not the artwork center. The
// four columns are revolver / shotgun / crossbow / flame. All aim axes remain
// right-facing; these pivots change presentation only, never bullet simulation.
const GRIPS = Object.freeze({
  'shana-astral-warden': [[.27, .60], [.28, .60], [.28, .59], [.25, .59]],
  'diamond-bloodmoon-regent': [[.26, .61], [.28, .56], [.28, .57], [.17, .65]],
  'scarlett-sunforge-phoenix': [[.29, .62], [.28, .60], [.28, .57], [.26, .60]],
  'hina-void-lotus': [[.28, .63], [.27, .60], [.27, .63], [.26, .58]],
  'shana-celestial-dragon-sovereign': [[.29, .59], [.28, .60], [.29, .57], [.26, .59]],
  'diamond-obsidian-eclipse-valkyrie': [[.26, .60], [.28, .56], [.28, .57], [.17, .65]],
  'scarlett-prismatic-tempest-seraph': [[.29, .61], [.28, .60], [.29, .57], [.26, .60]],
  'hina-nine-tail-chrono-kitsune': [[.28, .60], [.28, .57], [.28, .57], [.18, .64]],
});
const WEAPON_IDS = ['revolver', 'shotgun', 'crossbow', 'flame'];
// Mouth / bolt-tip centers inspected on the 768×384 weapon canvases. These
// are separate from the rear-hand pivot: each illustration has its own shape.
const MUZZLES = Object.freeze({
  'shana-astral-warden': [[619, 122], [661, 142], [630, 245], [606, 235]],
  'diamond-bloodmoon-regent': [[688, 131], [721, 176], [730, 197], [695, 251]],
  'scarlett-sunforge-phoenix': [[611, 123], [683, 258], [645, 308], [601, 271]],
  'hina-void-lotus': [[623, 144], [642, 153], [632, 187], [584, 173]],
  'shana-celestial-dragon-sovereign': [[616, 124], [635, 170], [629, 266], [594, 268]],
  'diamond-obsidian-eclipse-valkyrie': [[684, 133], [725, 169], [732, 191], [655, 246]],
  'scarlett-prismatic-tempest-seraph': [[554, 134], [646, 261], [597, 311], [592, 284]],
  'hina-nine-tail-chrono-kitsune': [[627, 114], [681, 119], [628, 184], [650, 151]],
});

export function weaponGrip(skinId, weaponId) {
  const index = WEAPON_IDS.indexOf(weaponId);
  const grip = Object.hasOwn(GRIPS, skinId) && GRIPS[skinId][index];
  return { x: grip?.[0] ?? .28, y: grip?.[1] ?? .60 };
}

export function weaponMuzzleUV(skinId, weaponId) {
  const muzzle = Object.hasOwn(MUZZLES, skinId) && MUZZLES[skinId][WEAPON_IDS.indexOf(weaponId)];
  return { x: (muzzle?.[0] ?? 640) / 768, y: (muzzle?.[1] ?? 192) / 384 };
}

export function weaponHandPosition(heroId, player) {
  const source = Object.hasOwn(HANDS, heroId) ? HANDS[heroId] : HANDS.shana;
  const frameNumber = Number(player.frame?.name);
  const frame = Number.isInteger(frameNumber) && frameNumber >= 0 && frameNumber < 48 ? frameNumber : 24;
  const [sourceX, sourceY] = source.rows[Math.floor(frame / 6)][frame % 6];
  const width = player.width || source.width;
  const height = player.height || source.height;
  const scaleX = Math.abs(player.scaleX ?? 1);
  const scaleY = Math.abs(player.scaleY ?? 1);
  // Phaser reflects texture pixels around its center, not around its origin.
  const normalizedX = player.flipX ? 1 - sourceX / source.width : sourceX / source.width;
  const normalizedY = player.flipY ? 1 - sourceY / source.height : sourceY / source.height;
  const x = (normalizedX - (player.originX ?? .5)) * width * scaleX;
  const y = (normalizedY - (player.originY ?? .5)) * height * scaleY;
  const rotation = player.rotation || 0;
  return {
    x: player.x + x * Math.cos(rotation) - y * Math.sin(rotation),
    y: player.y + x * Math.sin(rotation) + y * Math.cos(rotation),
  };
}
