export const BLOCKED_SURFACE_EVENTS = Object.freeze([
  'gesturestart', 'gesturechange', 'gestureend',
  'dblclick', 'selectstart', 'dragstart', 'contextmenu',
]);

export function installInteractionGuards(target = document) {
  const prevent = (event) => event.preventDefault();
  const preventCtrlWheel = (event) => {
    if (event.ctrlKey) event.preventDefault();
  };
  const options = { passive: false };
  BLOCKED_SURFACE_EVENTS.forEach((type) => target.addEventListener(type, prevent, options));
  target.addEventListener('wheel', preventCtrlWheel, options);
  return () => {
    BLOCKED_SURFACE_EVENTS.forEach((type) => target.removeEventListener(type, prevent, options));
    target.removeEventListener('wheel', preventCtrlWheel, options);
  };
}
