import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sheetNames = [
  '01-damage.png',
  '02-summons-a.png',
  '03-summons-status.png',
  '04-status-defense.png',
  '05-soul-general.png',
];

async function buildUpgradeAtlas() {
  const tiles = [];
  for (const sheetName of sheetNames) {
    const file = resolve(root, 'assets/ui/upgrade-sheets', sheetName);
    const { width, height } = await sharp(file).metadata();
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const left = Math.round(column * width / 4);
        const right = Math.round((column + 1) * width / 4);
        const top = Math.round(row * height / 5);
        const bottom = Math.round((row + 1) * height / 5);
        const size = Math.min(right - left, bottom - top);
        const squareLeft = left + Math.floor((right - left - size) / 2);
        const squareTop = top + Math.floor((bottom - top - size) / 2);
        const input = await sharp(file)
          .extract({ left: squareLeft, top: squareTop, width: size, height: size })
          .resize(96, 96, { fit: 'fill' })
          .png()
          .toBuffer();
        tiles.push({ input, left: (tiles.length % 10) * 96, top: Math.floor(tiles.length / 10) * 96 });
      }
    }
  }
  await sharp({ create: { width: 960, height: 960, channels: 4, background: '#08070d' } })
    .composite(tiles)
    .webp({ quality: 88, smartSubsample: true })
    .toFile(resolve(root, 'assets/ui/upgrade-icons.webp'));
}

async function buildWorldAssets() {
  await sharp(resolve(root, 'assets/map/night-soil-source.png'))
    .resize(1024, 1024, { fit: 'cover' })
    .webp({ quality: 88, smartSubsample: true })
    .toFile(resolve(root, 'assets/map/night-soil.webp'));
  await sharp(resolve(root, 'assets/sprites/mysterious-tree-source.png'))
    .resize(1084, 362, { fit: 'fill' })
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true })
    .toFile(resolve(root, 'assets/sprites/mysterious-tree-4f.webp'));
}

await mkdir(resolve(root, 'assets/ui'), { recursive: true });
await buildUpgradeAtlas();
await buildWorldAssets();
console.log('Built 100 upgrade icons, ground texture, and 4-frame tree sprite.');
