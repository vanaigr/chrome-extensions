const HOST_NAME = "com.resume_generator.host";

const titleEl = document.getElementById("title");
const targetLocationEl = document.getElementById("targetLocation");
const btn = document.getElementById("generate");
const statusEl = document.getElementById("status");

let pageInfo = null;

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

/*
async function loadPageInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
  return results[0]?.result ?? null;
}

async function init() {
  try {
    pageInfo = await loadPageInfo();
    if (!pageInfo) throw new Error("Could not read page");
    titleEl.textContent = pageInfo.title || "(no title)";
    targetLocationEl.textContent = '';
  } catch (e) {
    setStatus("Could not read page: " + e.message, "err");
    btn.disabled = true;
  }
}
*/

btn.addEventListener("click", () => {
  btn.disabled = true;
  setStatus("Generating…");

  const payload = {
    action: "generate",
    page: {
            title: titleEl.value.trim(),
            targetLocation: targetLocationEl.value.trim(),
        },
    requested_at: new Date().toISOString(),
  };

  chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
    btn.disabled = false;
    if (chrome.runtime.lastError) {
      setStatus("Host error: " + chrome.runtime.lastError.message, "err");
      return;
    }
    if (!response) {
      setStatus("No response from host", "err");
      return;
    }
    if (response.status === "ok") {
      setStatus(response.message || "Done", "ok");
    } else {
      setStatus(response.message || "Error", "err");
    }
  });
});
