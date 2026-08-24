export function installVisibleResume(game, { doc = document, win = window } = {}) {
  const resumeIfVisible = () => {
    if (doc.visibilityState !== 'hidden' && game.isPaused) game.resume();
  };

  win.addEventListener('focus', resumeIfVisible);
  win.addEventListener('pageshow', resumeIfVisible);
  win.addEventListener('pointerdown', resumeIfVisible, true);
  doc.addEventListener('visibilitychange', resumeIfVisible);

  return () => {
    win.removeEventListener('focus', resumeIfVisible);
    win.removeEventListener('pageshow', resumeIfVisible);
    win.removeEventListener('pointerdown', resumeIfVisible, true);
    doc.removeEventListener('visibilitychange', resumeIfVisible);
  };
}
