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

function normalize(url) {
  try {
    const u = new URL(url);
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}
function normalizeGreenhouse(url) {
    const u = new URL(url);
    const f = u.searchParams.get('for')
    const token = u.searchParams.get('token')

    u.search = '';
    u.hash = '';
    u.searchParams.set('for', f)
    u.searchParams.set('token', token)

    return u.toString();

}

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  if (isExcluded(url, exclusions)) return;

  const results = await chrome.history.search({
    text: normalize(url),
    startTime: 0,
    maxResults: 10000,
  });

  const times = [];
    if(url.hostname === 'job-boards.greenhouse.io') {
        const target = normalizeGreenhouse(url)
        for (const r of results) {
            if (normalizeGreenhouse(r.url) !== target) continue;
            const visits = await chrome.history.getVisits({ url: r.url });
            for (const v of visits) times.push(v.visitTime);
        }
    }
    else {
        const target = normalize(url)
        for (const r of results) {
            if (normalize(r.url) !== target) continue;
            const visits = await chrome.history.getVisits({ url: r.url });
            for (const v of visits) times.push(v.visitTime);
        }
    }

  if (times.length >= 2) {
    times.sort((a, b) => b - a);
    chrome.tabs.sendMessage(details.tabId, {
      type: "ALREADY_VISITED",
      lastVisit: times[1],
    });
  }
});
