export function skinSwipeStep(start, end, rotated = false) {
  const dx = end.clientX - start.clientX;
  const dy = end.clientY - start.clientY;
  const along = rotated ? dy : dx;
  const across = rotated ? dx : dy;
  if (Math.abs(along) < 24 || Math.abs(along) < Math.abs(across) * 1.2) return 0;
  return along < 0 ? 1 : -1;
}

export function bindSkinSwipe(element, { active, change, rotated }) {
  let start = null;
  let suppressClick = false;
  element.addEventListener('pointerdown', (event) => {
    suppressClick = false;
    if (!active() || start || event.isPrimary === false || event.button > 0) return;
    start = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY };
    element.setPointerCapture?.(event.pointerId);
  });
  element.addEventListener('pointerup', (event) => {
    if (!start || start.pointerId !== event.pointerId) return;
    const step = skinSwipeStep(start, event, rotated());
    start = null;
    if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (step && active()) {
      suppressClick = true;
      change(step);
    }
  });
  const cancel = () => { start = null; };
  element.addEventListener('pointercancel', cancel);
  element.addEventListener('lostpointercapture', cancel);
  element.addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  element.addEventListener('keydown', (event) => {
    if (!active() || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    change(event.key === 'ArrowRight' ? 1 : -1);
  });
}
