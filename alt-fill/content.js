// password.js: window.FILL_VALUE = "password"

document.addEventListener("click", (e) => {
  if (!e.altKey) return;

  const el = e.target;
  const isInput =
    (el.tagName === "INPUT" && !["checkbox", "radio", "submit", "button", "file", "image", "reset"].includes(el.type)) ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable;

  if (!isInput) return;

  e.preventDefault();
  e.stopPropagation();

  if (el.isContentEditable) {
    el.textContent = FILL_VALUE;
  } else {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
    if (setter) {
      setter.call(el, FILL_VALUE);
    } else {
      el.value = FILL_VALUE;
    }
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}, true);
