import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'skins', 'premium');
const skinIds = [
  'shana-astral-warden',
  'diamond-bloodmoon-regent',
  'scarlett-sunforge-phoenix',
  'hina-void-lotus',
  'shana-celestial-dragon-sovereign',
  'diamond-obsidian-eclipse-valkyrie',
  'scarlett-prismatic-tempest-seraph',
  'hina-nine-tail-chrono-kitsune',
];

for (const skinId of skinIds) {
  const source = resolve(root, `${skinId}-pack.png`);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1536 || metadata.height !== 1024) {
    throw new Error(`${skinId} pack art must be 1536x1024`);
  }
  await sharp(source)
    .webp({ quality: 91, alphaQuality: 96, effort: 6, smartSubsample: true })
    .toFile(resolve(root, `${skinId}-pack.webp`));
  await sharp(source).resize(480, 320, { fit: 'cover', position: 'centre' })
    .webp({ quality: 84, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(resolve(root, `${skinId}-card.webp`));
  console.log(`${skinId}: full + 480x320 card`);
}
