import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { alphaBounds, assertWeaponArt, removeGreenMatte } from './weapon-art-alpha.mjs';

const root = new URL('../assets/skins/premium/', import.meta.url);
const skins = [
  'diamond-bloodmoon-regent',
  'diamond-obsidian-eclipse-valkyrie',
  'hina-nine-tail-chrono-kitsune',
];
const weaponIds = ['revolver', 'shotgun', 'crossbow', 'flame'];
const outputs = [];

for (const skin of skins) {
  const source = new URL(`weapon-sheets/${skin}-matte.png`, root);
  const { data, info } = await sharp(fileURLToPath(source)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 1536 || info.height !== 1024) throw new Error(`${skin}: expected 1536x1024 sheet`);
  const alpha = removeGreenMatte(data);
  // Authored gutters, checked against the source sheet: include the complete bow
  // and its string even when the drawing extends a few pixels beyond half width.
  const splitTopX = 750;
  const splitBottomX = 800;
  const splitY = 480;
  const cells = [
    { left: 0, top: 0, width: splitTopX, height: splitY },
    { left: splitTopX, top: 0, width: info.width - splitTopX, height: splitY },
    { left: 0, top: splitY, width: splitBottomX, height: info.height - splitY },
    { left: splitBottomX, top: splitY, width: info.width - splitBottomX, height: info.height - splitY },
  ];
  for (const [index, cell] of cells.entries()) {
    const cut = await sharp(alpha, { raw: info }).extract(cell).raw().toBuffer({ resolveWithObject: true });
    const bounds = alphaBounds(cut.data, cut.info.width, cut.info.height);
    if (bounds.left < 3 || bounds.top < 3 || bounds.left + bounds.width > cell.width - 3
      || bounds.top + bounds.height > cell.height - 3) throw new Error(`${skin}/${weaponIds[index]}: source touches a cell edge`);
    const result = await sharp(cut.data, { raw: cut.info }).extract(bounds)
      .resize(704, 336, { fit: 'contain', background: '#00000000' })
      .extend({ left: 32, right: 32, top: 24, bottom: 24, background: '#00000000' })
      .webp({ lossless: true }).toBuffer();
    const decoded = await sharp(result).ensureAlpha().raw().toBuffer();
    assertWeaponArt(decoded, 768, 384, `${skin}/${weaponIds[index]}`);
    outputs.push({ file: new URL(`weapons/${skin}/${weaponIds[index]}.webp`, root), result });
  }
}
// Validate every cell before replacing any live asset. The source PNGs are kept.
for (const { file, result } of outputs) {
  await mkdir(fileURLToPath(new URL('./', file)), { recursive: true });
  await writeFile(fileURLToPath(file), result);
}
console.log(`Imported ${outputs.length} complete weapon images; dark body pixels preserved.`);
