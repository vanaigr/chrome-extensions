const HOST_NAME = "com.resume_generator.host";

const titleEl = document.getElementById("title");
const targetLocationEl = document.getElementById("targetLocation");
const btn = document.getElementById("generate");
const statusEl = document.getElementById("status");

function setStatus(msg, cls = "") {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

btn.addEventListener("click", () => {
  btn.disabled = true;
  setStatus("Generating…");

  const payload = {
    action: "generate",
    page: {
            title: titleEl.value.trim(),
            targetLocation: (() => {
                const location = targetLocationEl.value.trim()
                if(location === 'remote') return ''
                if(location === 'other') return ''
                if(location === 'multiple') return ''

                return location
            })(),
        },
    requested_at: new Date().toISOString(),
  };
    titleEl.value = ''
    targetLocationEl.value = ''

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
