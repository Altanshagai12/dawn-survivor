export function gameDeviceProfile({ coarse = false, width = 1024, cores = 8, memory = 8 } = {}) {
  const mobile = coarse || width <= 520;
  const constrained = mobile && ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  if (!mobile) return {
    mobile: false, enemyCap: 620, enemyGroup: 660, bulletCap: 420,
    enemyBulletCap: 180, gemCap: 320, treeChunkRadius: 2, treeCap: 220,
    vfxCap: 72, premiumVfxCap: 96, audioVoiceCap: 16,
    dustInterval: .09, cameraZoom: 1.05, lightScale: 1,
  };
  return {
    mobile: true, enemyCap: 620, enemyGroup: 660, bulletCap: constrained ? 260 : 340,
    enemyBulletCap: 110, gemCap: constrained ? 170 : 220, treeChunkRadius: 2, treeCap: 180,
    vfxCap: constrained ? 22 : 32, premiumVfxCap: constrained ? 34 : 48,
    audioVoiceCap: constrained ? 8 : 10,
    dustInterval: .14, cameraZoom: .82, lightScale: .82,
  };
}

export function cameraCompensatedViewport(width, height, zoom = 1) {
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return { width: width / safeZoom, height: height / safeZoom };
}

export function gameRenderResolution(devicePixelRatio = 1, {
  coarse = false, width = 1024, cores = 8, memory = 8,
} = {}) {
  const ratio = Number(devicePixelRatio);
  const mobile = coarse || width <= 520;
  const constrained = mobile && ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  const resolutionCap = constrained ? 2.5 : 3;
  return Math.min(resolutionCap, Math.max(1, Number.isFinite(ratio) ? ratio : 1));
}
