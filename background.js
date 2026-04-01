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

chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  const { exclusions = [] } = await chrome.storage.sync.get("exclusions");
  if (isExcluded(url, exclusions)) return;

  const visits = await chrome.history.getVisits({ url });

  if (visits.length >= 2) {
    chrome.tabs.sendMessage(details.tabId, { type: "ALREADY_VISITED" });
  }
});
