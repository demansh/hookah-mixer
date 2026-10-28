const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

export function addPressHandlers(element, { onTap, onLongPress, onLongPressEnd }) {
  let timer = null;
  let startPoint = null;
  let isLongPress = false;

  const cancelTimer = () => {
    clearTimeout(timer);
    timer = null;
  };
  const finishPress = () => {
    cancelTimer();
    if (isLongPress) {
      onLongPressEnd();
    }
  };

  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    isLongPress = false;
    startPoint = { x: event.clientX, y: event.clientY };
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      isLongPress = true;
      navigator.vibrate?.(10);
      onLongPress();
    }, LONG_PRESS_MS);
  });
  element.addEventListener('pointermove', (event) => {
    if (timer && Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > MOVE_TOLERANCE_PX) {
      cancelTimer();
    }
  });
  element.addEventListener('pointerup', finishPress);
  element.addEventListener('pointercancel', finishPress);
  element.addEventListener('pointerleave', finishPress);
  element.addEventListener('contextmenu', (event) => event.preventDefault());
  element.addEventListener('click', () => {
    if (isLongPress) {
      isLongPress = false;
      return;
    }
    onTap();
  });
}
