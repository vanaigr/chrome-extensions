(() => {
  const THRESHOLD = 50;
  const OVERLAY_CLASS = 'ctl-overlay';
  const ACTIVE_CLASS = 'ctl-active';
  const TEXT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'tel', 'password', 'number']);

  const isTarget = (el) => {
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) return TEXT_TYPES.has(el.type);
    return false;
  };

  const overlayMap = new WeakMap();
  let counter = 0;

  const getOverlay = (el) => {
    let overlay = overlayMap.get(el);
    if (overlay && overlay.isConnected) return overlay;
    const name = `--ctl-${counter++}`;
    el.style.setProperty('anchor-name', name);
    overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.setProperty('position-anchor', name);
    document.body.appendChild(overlay);
    overlayMap.set(el, overlay);
    return overlay;
  };

  const applyState = (el) => {
    if (!isTarget(el)) return;
    const overlay = getOverlay(el);
    overlay.classList.toggle(ACTIVE_CLASS, (el.value || '').length > THRESHOLD);
  };

  document.addEventListener('input', (e) => applyState(e.target), true);
  document.addEventListener('change', (e) => applyState(e.target), true);

  const scan = (root) => {
    const nodes = root.querySelectorAll?.('input, textarea');
    if (nodes) for (const n of nodes) applyState(n);
  };
  scan(document);

  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (isTarget(n)) applyState(n);
        else scan(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
