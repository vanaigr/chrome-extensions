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
  // labelMatch is a predicate over the lowercased container text. Any of the
  // provided regexes hitting is enough — use one regex with lookaheads when
  // you need AND semantics within a single alternative.
  const re = (...patterns) => (text) => patterns.some((p) => p.test(text));

  const WORKDAY_SELECTIONS = [
    { name: 'gender',           labelMatch: re(/gender/),    match: 'not declared' },
    { name: 'hispanicOrLatino', labelMatch: re(/hispanic/),  match: 'no' },
    { name: 'ethnicity',        labelMatch: re(/race/),      match: 'do not wish to answer' },
    { name: 'veteranStatus',    labelMatch: re(/veteran/),   match: 'do not wish to self-identify' },
  ];

  // Application questions that vary per tenant and don't have stable field
  // names — matched by the question label text instead.
  const WORKDAY_LABEL_SELECTIONS = [
    { key: 'workAuth',    labelMatch: re(/legally authorized to work/, /unrestricted authorization/, /right to work/), match: 'yes' },
    { key: 'sponsorship', labelMatch: re(/require.*sponsorship/, /visa status.*work authorization/),                  match: 'no' },
    { key: 'priorEmp',    labelMatch: re(/previously.*worked/, /previously.*employed/, /currently working for/, /have you worked for/, /current or former/, /current employee/), match: 'no' },
    { key: 'nonCompete',  labelMatch: re(/non-compete/),        match: 'no' },
    { key: 'over18',      labelMatch: re(/over the age of 18/), match: 'yes' },
    { key: 'relocate',    labelMatch: re(/willing to relocate/), match: 'yes' },
  ];

  function findWorkdayButton(fieldName) {
    // Prefer the listbox button by name; fall back to formField container.
    const byName = document.querySelector(`button[name="${fieldName}"][aria-haspopup="listbox"]`);
    if (byName) return byName;
    const container = document.querySelector(`[data-automation-id="formField-${fieldName}"]`);
    return container?.querySelector('button[aria-haspopup="listbox"]') ?? null;
  }

  function findWorkdayButtonByLabel(labelMatch) {
    const containers = document.querySelectorAll('[data-automation-id^="formField-"]');
    for (const c of containers) {
      const btn = c.querySelector('button[aria-haspopup="listbox"]');
      if (!btn) continue;
      const text = (c.textContent || '').toLowerCase();
      if (labelMatch(text)) return btn;
    }
    return null;
  }

  async function selectWorkdayOption(button, matchText) {
    const needle = matchText.toLowerCase();
    const currentLabel = (button.getAttribute('aria-label') || '').toLowerCase();
    if (currentLabel.includes(needle)) return true;

    // Wait for any previously-opened listbox portal to fully unmount so we
    // don't match it by mistake when opening the next dropdown.
    await waitFor(() => !document.querySelector('[role="listbox"]'), { timeout: 1500 });

    button.focus();
    button.click();

    // Wait for *this* button's popup: aria-expanded flips to "true" and
    // aria-controls points at the fresh listbox.
    const listbox = await waitFor(() => {
      if (button.getAttribute('aria-expanded') !== 'true') return null;
      const id = button.getAttribute('aria-controls');
      const el = id ? document.getElementById(id) : document.querySelector('[role="listbox"]');
      if (!el) return null;
      // Don't accept an empty listbox that hasn't populated yet.
      return el.querySelector('[role="option"], li') ? el : null;
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
      document.body.click();
      return false;
    }
    option.click();

    // Wait for the popup to close before returning so the next field starts clean.
    await waitFor(() => button.getAttribute('aria-expanded') !== 'true', { timeout: 1500 });
    await waitFor(() => !document.querySelector('[role="listbox"]'), { timeout: 1500 });
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
    for (const { name, labelMatch, match } of WORKDAY_SELECTIONS) {
      const btn = findWorkdayButton(name) || (labelMatch && findWorkdayButtonByLabel(labelMatch));
      if (!btn) continue;
      results[name] = (await selectWorkdayOption(btn, match)) ? 'ok' : 'failed';
    }
    for (const { key, labelMatch, match } of WORKDAY_LABEL_SELECTIONS) {
      const btn = findWorkdayButtonByLabel(labelMatch);
      if (!btn) continue;
      results[key] = (await selectWorkdayOption(btn, match)) ? 'ok' : 'failed';
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
