export function gameDeviceProfile({ coarse = false, width = 1024, cores = 8, memory = 8 } = {}) {
  const mobile = coarse || width <= 520;
  const constrained = mobile && ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  if (!mobile) return {
    mobile: false, enemyCap: 135, enemyGroup: 180, bulletCap: 360,
    enemyBulletCap: 180, gemCap: 280, treeChunkRadius: 2, treeCap: 145,
    vfxCap: 72, dustInterval: .09, cameraZoom: 1.05, lightScale: 1,
  };
  return {
    mobile: true, enemyCap: constrained ? 92 : 108, enemyGroup: 125, bulletCap: 240,
    enemyBulletCap: 110, gemCap: constrained ? 150 : 180, treeChunkRadius: 1, treeCap: 48,
    vfxCap: constrained ? 22 : 30, dustInterval: .14, cameraZoom: .88, lightScale: .82,
  };
}
