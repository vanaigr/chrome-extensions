(() => {
  if (window.__eeoAutofillLoaded) return;
  window.__eeoAutofillLoaded = true;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitFor(predicate, { timeout = 3000, interval = 50 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = predicate();
      if (v) return v;
      await sleep(interval);
    }
    return null;
  }

  // ---------- Workday (*.myworkdayjobs.com) ----------

  // Desired field -> option-text matcher. Matchers are case-insensitive substring
  // matches so minor wording differences between tenants still hit.
  const WORKDAY_SELECTIONS = [
    { name: 'gender',           match: 'not declared' },
    { name: 'hispanicOrLatino', match: 'no' },
    { name: 'ethnicity',        match: 'do not wish to answer' },
    { name: 'veteranStatus',    match: 'do not wish to self-identify' },
  ];

  function findWorkdayButton(fieldName) {
    // Prefer the listbox button by name; fall back to formField container.
    const byName = document.querySelector(`button[name="${fieldName}"][aria-haspopup="listbox"]`);
    if (byName) return byName;
    const container = document.querySelector(`[data-automation-id="formField-${fieldName}"]`);
    return container?.querySelector('button[aria-haspopup="listbox"]') ?? null;
  }

  async function selectWorkdayOption(button, matchText) {
    const needle = matchText.toLowerCase();
    const currentLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    // aria-label is roughly "<question> <current value> Required". If it already
    // contains the desired text we can skip the click dance.
    if (currentLabel.includes(needle)) return true;

    button.focus();
    button.click();

    const listbox = await waitFor(() => {
      const listboxId = button.getAttribute('aria-controls');
      if (listboxId) {
        const el = document.getElementById(listboxId);
        if (el) return el;
      }
      return document.querySelector('[role="listbox"]');
    });
    if (!listbox) return false;

    const option = await waitFor(() => {
      const opts = listbox.querySelectorAll('[role="option"], li');
      for (const o of opts) {
        if ((o.textContent || '').trim().toLowerCase().includes(needle)) return o;
      }
      return null;
    });
    if (!option) {
      // Close the popup so we don't leave the UI in a weird state.
      document.body.click();
      return false;
    }
    option.click();
    await sleep(60);
    return true;
  }

  function checkWorkdayTerms() {
    const box = document.querySelector(
      'input[name="acceptTermsAndAgreements"], input#termsAndConditions--acceptTermsAndAgreements'
    );
    if (!box) return false;
    if (!box.checked) box.click();
    return true;
  }

  async function runWorkday() {
    const results = {};
    for (const { name, match } of WORKDAY_SELECTIONS) {
      const btn = findWorkdayButton(name);
      if (!btn) { results[name] = 'missing'; continue; }
      results[name] = (await selectWorkdayOption(btn, match)) ? 'ok' : 'failed';
    }
    results.terms = checkWorkdayTerms() ? 'ok' : 'missing';
    console.log('[EEO Autofill] Workday:', results);
  }

  // ---------- dispatcher ----------

  function pickAlgorithm() {
    const host = location.hostname;
    if (/\.myworkdayjobs\.com$/i.test(host)) return runWorkday;
    return null;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'eeo-autofill') return;
    const algo = pickAlgorithm();
    if (!algo) {
      console.log('[EEO Autofill] no algorithm for', location.hostname);
      sendResponse({ ok: false, reason: 'no-algorithm' });
      return;
    }
    algo().then(() => sendResponse({ ok: true }));
    return true; // async response
  });
})();
