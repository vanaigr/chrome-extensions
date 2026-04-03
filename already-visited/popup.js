const listEl = document.getElementById("list");
const inputEl = document.getElementById("input");
const addBtn = document.getElementById("add-btn");

function getKind() {
  return document.querySelector('input[name="kind"]:checked').value;
}

async function load() {
  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  render(exclusions);
}

function render(exclusions) {
  if (exclusions.length === 0) {
    listEl.innerHTML = '<div class="empty">No exclusions yet</div>';
    return;
  }
  listEl.innerHTML = "";
  exclusions.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <span class="item-label">${escapeHtml(item.value)}</span>
      <span class="item-type">${item.kind}</span>
      <button data-index="${i}" title="Remove">&times;</button>
    `;
    row.querySelector("button").addEventListener("click", () => remove(i));
    listEl.appendChild(row);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function add() {
  const value = inputEl.value.trim();
  if (!value) return;
  const kind = getKind();

  if (kind === "regex") {
    try { new RegExp(value); }
    catch { alert("Invalid regex"); return; }
  }

  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  exclusions.push({ kind, value });
  await chrome.storage.sync.set({ exclusions });
  inputEl.value = "";
  render(exclusions);
}

async function remove(index) {
  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  exclusions.splice(index, 1);
  await chrome.storage.sync.set({ exclusions });
  render(exclusions);
}

addBtn.addEventListener("click", add);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") add();
});

load();
