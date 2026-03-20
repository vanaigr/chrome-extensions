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

function queryAllButtons(root) {
  return [
    ...root.querySelectorAll('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]'),
  ];
}

// Load ignores first, then activate if the current URL isn't ignored
chrome.storage.sync.get({ ignores: [] }, ({ ignores }) => {
  if (isIgnored(ignores)) return;

  // Initial pass
  bigifyButtons(queryAllButtons(document));

  // Watch for dynamically added buttons
  const observer = new MutationObserver((mutations) => {
    const newButtons = [];
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (
          node.matches('button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')
        ) {
          newButtons.push(node);
        }
        newButtons.push(...queryAllButtons(node));
      }
    }
    if (newButtons.length > 0) bigifyButtons(newButtons);
  });

  observer.observe(document.body, { childList: true, subtree: true });
});
