// Import an explicitly authored green technical matte, never infer the background
// from dark pixels in the weapon. RGB-neutral black/gray/white remain opaque.
export function removeGreenMatte(data) {
  const result = Buffer.from(data);
  for (let i = 0; i < result.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const excess = green - Math.max(red, blue);
    if (excess <= 20) continue;
    const alpha = 255 - excess;
    // The generated technical matte has small compression/color variations.
    // This explicit green-only tolerance cannot classify black metal as background.
    if (green > 185 && excess > 130 && Math.max(red, blue) < 100) {
      result.fill(0, i, i + 4);
      continue;
    }
    result[i] = Math.min(255, Math.round(red * 255 / alpha));
    result[i + 1] = Math.min(255, Math.round((green - excess) * 255 / alpha));
    result[i + 2] = Math.min(255, Math.round(blue * 255 / alpha));
    result[i + 3] = Math.round(data[i + 3] * alpha / 255);
  }
  return result;
}

export function alphaBounds(data, width, height, threshold = 8) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] < threshold) continue;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error('Weapon artwork is empty');
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function weaponArtMetrics(data, width, height) {
  let solid = 0;
  let mass = 0;
  let sumX = 0;
  let sumY = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = data[(y * width + x) * 4 + 3];
    if (alpha < 64) continue;
    solid += 1;
    mass += alpha;
    sumX += x * alpha;
    sumY += y * alpha;
  }
  return { coverage: solid / (width * height), x: sumX / mass / width, y: sumY / mass / height };
}

export function assertWeaponArt(data, width, height, label) {
  const metrics = weaponArtMetrics(data, width, height);
  if (metrics.coverage < .13 || metrics.coverage > .72
    || Math.abs(metrics.x - .5) > .16 || Math.abs(metrics.y - .5) > .2) {
    throw new Error(`${label}: incomplete, off-center or opaque-background weapon: ${JSON.stringify(metrics)}`);
  }
  return metrics;
}
