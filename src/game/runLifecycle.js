export function startFreshRun(sceneManager, selection) {
  const gameIsPresent = sceneManager.isActive('game')
    || sceneManager.isPaused('game')
    || sceneManager.isSleeping('game');
  if (gameIsPresent) sceneManager.stop('game');
  sceneManager.start('game', selection);
}

export function singleFlight(action) {
  let pending = false;
  return async (...args) => {
    if (pending) return false;
    pending = true;
    try {
      await action(...args);
      return true;
    } finally {
      pending = false;
    }
  };
}
