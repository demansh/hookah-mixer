let hideTimer = null;
let peekTimer = null;

export function showToast(message, { duration, actionLabel, onAction } = {}) {
  const toast = document.getElementById('toast');
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  const children = [text];
  if (actionLabel && onAction) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'toast-action';
    action.textContent = actionLabel;
    action.addEventListener('click', () => {
      hideToast();
      onAction();
    });
    children.push(action);
  }
  toast.replaceChildren(...children);
  toast.hidden = false;
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideToast, duration);
}

export function hideToast() {
  clearTimeout(hideTimer);
  document.getElementById('toast').hidden = true;
}

export function showPeek(message) {
  clearTimeout(peekTimer);
  const peek = document.getElementById('peek');
  peek.textContent = message;
  peek.hidden = false;
}

export function hidePeekAfter(delay) {
  clearTimeout(peekTimer);
  peekTimer = setTimeout(() => {
    document.getElementById('peek').hidden = true;
  }, delay);
}
