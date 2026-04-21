const HOST_NAME = "com.resume_generator.host";

const titleEl = document.getElementById("title");
const targetLocationEl = document.getElementById("targetLocation");
const btn = document.getElementById("generate");
const scrapeBtn = document.getElementById("scrape");
const statusEl = document.getElementById("status");

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab");
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
  return results[0]?.result ?? null;
}

scrapeBtn.addEventListener("click", async () => {
  scrapeBtn.disabled = true;
  setStatus("Scraping…");
  try {
    const text = await scrapeActiveTab();
    if (!text) throw new Error("No result from page");

        const payload = {
            action: 'scrape',
            text,
        }

        chrome.runtime.sendNativeMessage(HOST_NAME, payload, (response) => {
            if (chrome.runtime.lastError) {
                setStatus("SCRAPE: Host error: " + chrome.runtime.lastError.message, "err");
                return;
            }
            if (!response) {
                setStatus("SCRAPE: No response from host", "err");
                return;
            }
            if (response.status === "ok") {
                titleEl.value = response.result.title ?? "";
                const location = response.result.location ?? "";

                if(location === 'remote') targetLocationEl.value = ''
                else targetLocationEl.value = location

                setStatus("Scraped", "ok");
            } else {
                setStatus(response.message || "Error", "err");
            }
        })

  } catch (e) {
    setStatus("Scrape failed: " + e.message, "err");
  } finally {
    scrapeBtn.disabled = false;
  }
});

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
      setStatus(`Generated (${payload.page.title})` || "Done", "ok");
    } else {
      setStatus(response.message || "Error", "err");
    }
  });
});
