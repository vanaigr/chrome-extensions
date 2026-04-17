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

  const sync = (el, overlay) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      overlay.style.display = 'none';
      return;
    }
    overlay.style.display = '';
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  };

  const getOverlay = (el) => {
    let overlay = overlayMap.get(el);
    if (overlay && overlay.isConnected) return overlay;
    overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(overlay);
    overlayMap.set(el, overlay);
    const update = () => sync(el, overlay);
    new ResizeObserver(update).observe(el);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    update();
    return overlay;
  };

  const applyState = (el) => {
    if (!isTarget(el)) return;
    const overlay = getOverlay(el);
    overlay.classList.toggle(ACTIVE_CLASS, (el.value || '').length > THRESHOLD);
    sync(el, overlay);
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
