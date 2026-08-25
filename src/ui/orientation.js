export function isMobilePortrait() {
  return matchMedia('(pointer: coarse)').matches && matchMedia('(orientation: portrait)').matches;
}

export async function requestLandscape() {
  if (!matchMedia('(pointer: coarse)').matches || !screen.orientation?.lock) return false;
  try {
    await screen.orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}

export function installOrientationGate() {
  const gate = document.getElementById('orientation-gate');
  const refresh = () => gate?.classList.toggle('hidden', !isMobilePortrait());
  addEventListener('resize', refresh, { passive: true });
  addEventListener('orientationchange', refresh, { passive: true });
  refresh();
  requestLandscape();
  return refresh;
}
