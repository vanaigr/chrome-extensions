// fill.js: window.FILL_VALUE, window.FILL_VALUES

let lastContextTarget = null;

function isFillable(el) {
  if (!el) return false;
  return (
    (el.tagName === "INPUT" && !["checkbox", "radio", "submit", "button", "file", "image", "reset"].includes(el.type)) ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  );
}

function fill(el, value) {
  if (!isFillable(el)) return;

  if (el.isContentEditable) {
    el.textContent = value;
  } else {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

document.addEventListener("click", (e) => {
  if (!e.altKey) return;
  if (!isFillable(e.target)) return;

  e.preventDefault();
  e.stopPropagation();
  fill(e.target, FILL_VALUE);
}, true);

document.addEventListener("contextmenu", (e) => {
  lastContextTarget = e.target;
}, true);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "ALT_FILL") return;
  const value = FILL_VALUES[msg.key];
  if (value == null) return;

  const target = isFillable(lastContextTarget) ? lastContextTarget : document.activeElement;
  fill(target, value);
});
