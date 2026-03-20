const list = document.getElementById('ignore-list');
const input = document.getElementById('new-regex');
const addBtn = document.getElementById('add-btn');
const errorMsg = document.getElementById('error-msg');

let currentUrl = '';
let ignores = [];

// Get the active tab URL, then load and render ignores
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentUrl = tabs[0]?.url ?? '';
  loadIgnores();
});

function loadIgnores() {
  chrome.storage.sync.get({ ignores: [] }, ({ ignores: stored }) => {
    ignores = stored;
    render();
  });
}

function saveIgnores() {
  chrome.storage.sync.set({ ignores });
}

function testRegex(pattern, url) {
  try {
    return new RegExp(pattern).test(url) ? 'match' : 'no-match';
  } catch {
    return 'invalid';
  }
}

function badgeLabel(state) {
  return state === 'match' ? 'ignored' : state === 'no-match' ? 'active' : 'invalid regex';
}

function render() {
  list.innerHTML = '';
  ignores.forEach((pattern, i) => {
    const state = testRegex(pattern, currentUrl);

    const li = document.createElement('li');
    li.className = 'ignore-item';

    const code = document.createElement('code');
    code.textContent = pattern;

    const badge = document.createElement('span');
    badge.className = `badge ${state}`;
    badge.textContent = badgeLabel(state);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.title = 'Remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      ignores.splice(i, 1);
      saveIgnores();
      render();
    });

    li.append(code, badge, removeBtn);
    list.appendChild(li);
  });
}

function addIgnore() {
  const pattern = input.value.trim();
  errorMsg.textContent = '';
  input.classList.remove('error');

  if (!pattern) return;

  try {
    new RegExp(pattern);
  } catch (e) {
    errorMsg.textContent = 'Invalid regular expression.';
    input.classList.add('error');
    return;
  }

  if (ignores.includes(pattern)) {
    errorMsg.textContent = 'Pattern already exists.';
    input.classList.add('error');
    return;
  }

  ignores.push(pattern);
  saveIgnores();
  input.value = '';
  render();
}

addBtn.addEventListener('click', addIgnore);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addIgnore();
});
input.addEventListener('input', () => {
  input.classList.remove('error');
  errorMsg.textContent = '';
});
