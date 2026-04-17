(() => {
  const THRESHOLD = 50;
  const WRAP_CLASS = 'ctl-wrap';
  const ACTIVE_CLASS = 'ctl-active';
  const TEXT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'tel', 'password', 'number']);

  const isTarget = (el) => {
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLInputElement) return TEXT_TYPES.has(el.type);
    return false;
  };

  const getWrap = (el) => {
    const p = el.parentElement;
    if (p && p.classList.contains(WRAP_CLASS) && p.childElementCount === 1) return p;
    const wrap = document.createElement('span');
    wrap.className = WRAP_CLASS;
    el.replaceWith(wrap);
    wrap.appendChild(el);
    return wrap;
  };

  const update = (el) => {
    if (!isTarget(el)) return;
    const wrap = getWrap(el);
    wrap.classList.toggle(ACTIVE_CLASS, (el.value || '').length > THRESHOLD);
  };

  document.addEventListener('input', (e) => update(e.target), true);
  document.addEventListener('change', (e) => update(e.target), true);

  const scan = (root) => {
    const nodes = root.querySelectorAll?.('input, textarea');
    if (nodes) for (const n of nodes) update(n);
  };

  scan(document);

  new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (isTarget(n)) update(n);
        else scan(n);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
