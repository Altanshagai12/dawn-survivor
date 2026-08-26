const COARSE_POINTER = '(pointer: coarse)';
const PORTRAIT = '(orientation: portrait)';

function matches(query) {
  return typeof matchMedia === 'function' && matchMedia(query).matches;
}

export function isMobilePortrait() {
  return matches(COARSE_POINTER) && matches(PORTRAIT);
}

export function landscapeViewportSize({ width, height, mobilePortrait }) {
  return mobilePortrait
    ? { width: Math.max(width, height), height: Math.min(width, height) }
    : { width, height };
}

export function gameViewportSize() {
  return landscapeViewportSize({
    width: window.innerWidth,
    height: window.innerHeight,
    mobilePortrait: isMobilePortrait(),
  });
}

export async function requestLandscape() {
  if (!matches(COARSE_POINTER) || !screen.orientation?.lock) return false;
  try {
    await screen.orientation.lock('landscape');
    return true;
  } catch {
    return false;
  }
}

export function installAutoLandscape() {
  const refresh = () => {
    document.documentElement.style.setProperty('--app-viewport-width', `${window.innerWidth}px`);
    document.documentElement.style.setProperty('--app-viewport-height', `${window.innerHeight}px`);
    document.documentElement.classList.toggle('mobile-rotated', isMobilePortrait());
  };

  addEventListener('resize', refresh, { passive: true });
  addEventListener('orientationchange', refresh, { passive: true });
  refresh();
  void requestLandscape().finally(refresh);
  return refresh;
}
