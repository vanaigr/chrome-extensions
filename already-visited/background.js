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

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  if (isExcluded(url, exclusions)) return;

  const target = normalize(url);
  const results = await chrome.history.search({
    text: target,
    startTime: 0,
    maxResults: 1000,
  });

  let count = 0;
  for (const r of results) {
    if (normalize(r.url) !== target) continue;
    const visits = await chrome.history.getVisits({ url: r.url });
    count += visits.length;
    if (count >= 2) break;
  }

  if (count >= 2) {
    chrome.tabs.sendMessage(details.tabId, { type: "ALREADY_VISITED" });
  }
});
