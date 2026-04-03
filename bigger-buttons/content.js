const SCALE = 1.5;
const ATTR = 'data-big-buttons-original';

function isIgnored(ignores) {
  const url = window.location.href;
  return ignores.some((pattern) => {
    try {
      return new RegExp(pattern).test(url);
    } catch {
      return false;
    }
  });
}

function bigifyButtons(buttons) {
  buttons.forEach((btn) => {
    if (btn.hasAttribute(ATTR)) return;

    const computed = window.getComputedStyle(btn);
    const originalFontSize = computed.fontSize;
    const originalPaddingTop = computed.paddingTop;
    const originalPaddingBottom = computed.paddingBottom;
    const originalPaddingLeft = computed.paddingLeft;
    const originalPaddingRight = computed.paddingRight;

    btn.setAttribute(ATTR, JSON.stringify({
      fontSize: originalFontSize,
      paddingTop: originalPaddingTop,
      paddingBottom: originalPaddingBottom,
      paddingLeft: originalPaddingLeft,
      paddingRight: originalPaddingRight,
    }));

    const baseFontSize = parseFloat(originalFontSize) || 14;
    const newFontSize = baseFontSize * SCALE;

    const scale = (val) => {
      const n = parseFloat(val);
      if (isNaN(n)) return val;
      return (Math.max(n, 4) * SCALE) + 'px';
    };

    btn.style.setProperty('font-size', newFontSize + 'px', 'important');
    btn.style.setProperty('padding-top', scale(originalPaddingTop), 'important');
    btn.style.setProperty('padding-bottom', scale(originalPaddingBottom), 'important');
    btn.style.setProperty('padding-left', scale(originalPaddingLeft), 'important');
    btn.style.setProperty('padding-right', scale(originalPaddingRight), 'important');
    btn.style.setProperty('min-height', '44px', 'important');
    btn.style.setProperty('min-width', '44px', 'important');
    btn.style.setProperty('box-sizing', 'border-box', 'important');
  });
}

const CONTROL_ATTR = 'data-big-buttons-control-original';

function bigifyInputControls(controls) {
  controls.forEach((control) => {
    if (control.hasAttribute(CONTROL_ATTR)) return;

    const computed = window.getComputedStyle(control);
    const originalWidth = computed.width;
    const originalHeight = computed.height;

    control.setAttribute(CONTROL_ATTR, JSON.stringify({ width: originalWidth, height: originalHeight }));

    const baseSize = parseFloat(originalWidth) || 13;
    const newSize = Math.round(baseSize * SCALE) + 'px';

    control.style.setProperty('width', newSize, 'important');
    control.style.setProperty('height', newSize, 'important');
    control.style.setProperty('cursor', 'pointer', 'important');

    // Scale the associated label, if any
    const label = control.id
      ? document.querySelector(`label[for="${CSS.escape(control.id)}"]`)
      : control.closest('label');
    if (label && !label.hasAttribute(CONTROL_ATTR)) {
      const labelComputed = window.getComputedStyle(label);
      const origFont = labelComputed.fontSize;
      label.setAttribute(CONTROL_ATTR, JSON.stringify({ fontSize: origFont }));
      label.style.setProperty('font-size', (parseFloat(origFont) * SCALE) + 'px', 'important');
    }
  });
}

function queryAllButtons(root) {
  const candidates = [
    ...root.querySelectorAll('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]'),
  ];
  const links = [...root.querySelectorAll('a[href]')].filter(
    (a) => window.getComputedStyle(a).display !== 'inline'
  );
  return [...candidates, ...links];
}

function queryAllControls(root) {
  return [...root.querySelectorAll('input[type="radio"], input[type="checkbox"]')];
}

// Load ignores first, then activate if the current URL isn't ignored
chrome.storage.sync.get({ ignores: [] }, ({ ignores }) => {
  if (isIgnored(ignores)) return;

  // Initial pass
  bigifyButtons(queryAllButtons(document));
  bigifyInputControls(queryAllControls(document));

  // Watch for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    const newButtons = [];
    const newControls = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.matches('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')) {
          newButtons.push(node);
        }
        if (node.matches('a[href]') && window.getComputedStyle(node).display !== 'inline') {
          newButtons.push(node);
        }
        if (node.matches('input[type="radio"], input[type="checkbox"]')) {
          newControls.push(node);
        }
        newButtons.push(...queryAllButtons(node));
        newControls.push(...queryAllControls(node));
      }
    }
    if (newButtons.length > 0) bigifyButtons(newButtons);
    if (newControls.length > 0) bigifyInputControls(newControls);
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
