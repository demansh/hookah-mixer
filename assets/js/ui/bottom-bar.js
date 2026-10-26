export function initBottomBar(bar) {
  const root = document.documentElement;

  const updateHeight = () => {
    root.style.setProperty('--bottom-bar-height', `${Math.ceil(bar.getBoundingClientRect().height)}px`);
  };

  const updateKeyboardOffset = () => {
    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }
    const hiddenBelow = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    root.style.setProperty('--keyboard-offset', `${Math.round(hiddenBelow)}px`);
  };

  new ResizeObserver(updateHeight).observe(bar);
  window.visualViewport?.addEventListener('resize', updateKeyboardOffset);
  window.visualViewport?.addEventListener('scroll', updateKeyboardOffset);
  updateHeight();
  updateKeyboardOffset();
}
