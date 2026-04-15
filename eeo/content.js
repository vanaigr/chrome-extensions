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

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    const parentSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    (setter && setter !== parentSetter ? setter : parentSetter).call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async function getPageVar(name) {
    try {
      const res = await chrome.runtime.sendMessage({ type: 'eeo-get-page-var', name });
      return res?.value;
    } catch { return undefined; }
  }

  async function fillWorkdayName() {
    const input = document.querySelector('[data-automation-id="formField-name"] input[name="name"]');
    if (!input) return 'missing';
    const value = await getPageVar('__autofill_name__');
    if (typeof value !== 'string' || !value) return 'no-value';
    if (input.value === value) return 'ok';
    input.focus();
    setNativeValue(input, value);
    input.blur();
    return 'ok';
  }

  function fillWorkdaySignDate() {
    const wrapper = document.querySelector('[data-automation-id="formField-dateSignedOn"] [data-automation-id="dateInputWrapper"]');
    if (!wrapper) return 'missing';
    const month = wrapper.querySelector('[data-automation-id="dateSectionMonth-input"]');
    const day = wrapper.querySelector('[data-automation-id="dateSectionDay-input"]');
    const year = wrapper.querySelector('[data-automation-id="dateSectionYear-input"]');
    if (!month || !day || !year) return 'missing';
    const filled = (el) => {
      const v = el.getAttribute('aria-valuenow') ?? el.value;
      return v != null && v !== '';
    };
    if (filled(month) && filled(day) && filled(year)) return 'ok';
    const now = new Date();
    const parts = [
      [month, String(now.getMonth() + 1)],
      [day, String(now.getDate())],
      [year, String(now.getFullYear())],
    ];
    for (const [el, v] of parts) {
      el.focus();
      setNativeValue(el, v);
    }
    year.blur();
    return 'ok';
  }

  function checkDisabilityOptOut() {
    const group = document.querySelector('[data-automation-id="disabilityStatus-CheckboxGroup"]');
    if (!group) return 'missing';
    const labels = group.querySelectorAll('label[for]');
    for (const label of labels) {
      if ((label.textContent || '').trim().toLowerCase() === 'i do not want to answer') {
        const box = document.getElementById(label.getAttribute('for'));
        if (!box) return 'missing';
        if (!box.checked) box.click();
        return 'ok';
      }
    }
    return 'missing';
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
      if (!btn) continue;
      results[name] = (await selectWorkdayOption(btn, match)) ? 'ok' : 'failed';
    }
    if (document.querySelector('[data-automation-id="formField-name"] input[name="name"]')) {
      results.name = await fillWorkdayName();
    }
    if (document.querySelector('[data-automation-id="formField-dateSignedOn"]')) {
      results.dateSignedOn = fillWorkdaySignDate();
    }
    if (document.querySelector('[data-automation-id="disabilityStatus-CheckboxGroup"]')) {
      results.disability = checkDisabilityOptOut();
    }
    if (checkWorkdayTerms()) results.terms = 'ok';
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
