const HOST_NAME = "com.resume_generator.host";

const targetLocationEl = document.getElementById("targetLocation");
const targetLocationListEl = document.getElementById("targetLocationList");
const btn = document.getElementById("generate");
const statusEl = document.getElementById("status");

let cities = [];
fetch(chrome.runtime.getURL("cities.json"))
    .then(r => r.json())
    .then(data => {
        cities = data.slice().sort((a, b) => b.population - a.population);
    });

const MAX_SUGGESTIONS = 5;
let acItems = [];
let acActive = -1;

function renderSuggestions() {
    const q = targetLocationEl.value.trim().toLowerCase();
    if (!q) {
        targetLocationListEl.classList.remove("open");
        acItems = [];
        acActive = -1;
        return;
    }
    acItems = [];
    for (const c of cities) {
        if (c.city.toLowerCase().includes(q)) {
            acItems.push(c);
            if (acItems.length >= MAX_SUGGESTIONS) break;
        }
    }
    if (acItems.length === 0) {
        targetLocationListEl.classList.remove("open");
        acActive = -1;
        return;
    }
    acActive = 0;
    targetLocationListEl.innerHTML = "";
    acItems.forEach((c, i) => {
        const div = document.createElement("div");
        div.className = "ac-item" + (i === 0 ? " active" : "");
        const sw = document.createElement("span");
        sw.className = "ac-swatch " + c.party;
        div.appendChild(sw);
        const label = document.createElement("span");
        label.textContent = `${c.city}, ${c.state}`;
        div.appendChild(label);
        div.addEventListener("mousedown", (e) => {
            e.preventDefault();
            pickSuggestion(i);
        });
        targetLocationListEl.appendChild(div);
    });
    targetLocationListEl.classList.add("open");
}

function updateActive() {
    for (const el of targetLocationListEl.children) el.classList.remove("active");
    const el = targetLocationListEl.children[acActive];
    if (el) {
        el.classList.add("active");
        el.scrollIntoView({ block: "nearest" });
    }
}

function pickSuggestion(i) {
    const c = acItems[i];
    if (!c) return;
    targetLocationEl.value = `${c.city}, ${c.state}`;
    targetLocationListEl.classList.remove("open");
    acItems = [];
    acActive = -1;
}

targetLocationEl.addEventListener("input", renderSuggestions);
targetLocationEl.addEventListener("focus", renderSuggestions);
targetLocationEl.addEventListener("blur", () => {
    targetLocationListEl.classList.remove("open");
});
targetLocationEl.addEventListener("keydown", (e) => {
    if (!targetLocationListEl.classList.contains("open")) return;
    if (e.key === "ArrowDown") {
        e.preventDefault();
        acActive = (acActive + 1) % acItems.length;
        updateActive();
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        acActive = (acActive - 1 + acItems.length) % acItems.length;
        updateActive();
    } else if (e.key === "Enter") {
        if (acActive >= 0) {
            e.preventDefault();
            pickSuggestion(acActive);
        }
    } else if (e.key === "Escape") {
        targetLocationListEl.classList.remove("open");
    }
});

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
            targetLocation: (() => {
                const location = targetLocationEl.value.trim()
                if(location === 'other') return ''
                if(location === 'multiple') return ''

                return location
            })(),
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
        if (response.status !== "ok") {
            setStatus(response.message || "Error", "err");
            return
        }

        setStatus(`Generated (${payload.page.targetLocation})` || "Done", "ok");
        targetLocationEl.value = ''
    });
});
