export function gameDeviceProfile({ coarse = false, width = 1024, cores = 8, memory = 8 } = {}) {
  const mobile = coarse || width <= 520;
  const constrained = mobile && ((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  if (!mobile) return {
    mobile: false, enemyCap: 620, enemyGroup: 660, bulletCap: 420,
    enemyBulletCap: 180, gemCap: 320, treeChunkRadius: 2, treeCap: 220,
    vfxCap: 72, dustInterval: .09, cameraZoom: 1.05, lightScale: 1,
  };
  return {
    mobile: true, enemyCap: 620, enemyGroup: 660, bulletCap: constrained ? 260 : 340,
    enemyBulletCap: 110, gemCap: constrained ? 170 : 220, treeChunkRadius: 2, treeCap: 180,
    vfxCap: constrained ? 22 : 32, dustInterval: .14, cameraZoom: .82, lightScale: .82,
  };
}
