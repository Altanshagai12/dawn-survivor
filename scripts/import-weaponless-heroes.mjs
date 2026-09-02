import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { HERO_ATLASES } from '../src/config/assets.js';
import { removeGreenMatte } from './weapon-art-alpha.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = resolve(root, 'assets/sprites/heroes/weaponless');

// These edits retain the entire original 6x8 grid. Never trim/recenter the body:
// the game hitbox and authored per-frame hand anchors use the original geometry.
export async function prepareWeaponlessHero(source, atlas) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = atlas.frameWidth * 6;
  const height = atlas.frameHeight * 8;
  if (Math.abs(info.width / info.height - width / height) > .015) {
    throw new Error(`${atlas.key}: unexpected source grid aspect ratio`);
  }
  // Hina's authored green matte is lighter than the other three sheets. Accept
  // that explicit saturated-green range as well; never key neutral/dark pixels.
  const matte = Buffer.from(data);
  for (let i = 0; i < matte.length; i += 4) {
    const [red, green, blue] = matte.subarray(i, i + 3);
    if (green > 175 && green - Math.max(red, blue) > 75 && Math.max(red, blue) < 145) {
      matte.fill(0, i, i + 4);
    }
  }
  return sharp(removeGreenMatte(matte), { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(width, height, { fit: 'fill', kernel: 'lanczos3' })
    .webp({ lossless: true, effort: 6 }).toBuffer();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputs = [];
  for (const [id, atlas] of Object.entries(HERO_ATLASES)) {
    const output = await prepareWeaponlessHero(resolve(directory, 'source', `${id}-matte.png`), atlas);
    outputs.push({ id, output });
  }
  // All four sources must decode and validate before replacing any output.
  for (const { id, output } of outputs) {
    await writeFile(resolve(directory, `${id}-atlas.webp`), output);
    console.log(`${id}: imported weaponless body on the original 6x8 grid`);
  }
}
