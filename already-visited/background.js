function isExcluded(url, exclusions) {
    for (const item of exclusions) {
        if (item.kind === "domain") {
            try {
                const hostname = new URL(url).hostname;
                if (hostname === item.value || hostname.endsWith("." + item.value)) return true;
            } catch {}
        } else {
            try {
                if (new RegExp(item.value).test(url)) return true;
            } catch {}
        }
    }
    return false;
}

function aggressiveNormalize(ur) {
    try {
        const u = new URL(url)
        u.search = ''
        u.hash = ''
        return u.toString()
    } catch {
        return url
    }
}

function normalize(url) {
    try {
        const u = new URL(url)
        u.searchParams.delete('jr_id')
        u.searchParams.delete('utm_source')
        u.hash = ''
        return u.toString()
    } catch {
        return url
    }
}

chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0) return;

    const url = details.url;
    if (!url.startsWith("http")) return;

    const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
    if (isExcluded(url, exclusions)) return;

    const results = await chrome.history.search({
        text: aggressiveNormalize(url),
        startTime: 0,
        maxResults: 10000,
    });

    const times = [];

    const target = normalize(url)
    for (const r of results) {
        if (normalize(r.url) !== target) continue;
        const visits = await chrome.history.getVisits({ url: r.url });
        for (const v of visits) times.push(v.visitTime);
    }

    if (times.length >= 2) {
        times.sort((a, b) => b - a);
        chrome.tabs.sendMessage(details.tabId, {
            type: "ALREADY_VISITED",
            lastVisit: times[1],
        });
    }
});
