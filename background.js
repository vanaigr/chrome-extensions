chrome.webNavigation.onCompleted.addListener(async (details) => {
  // Only care about top-level frames (not iframes)
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url.startsWith("http")) return;

  // Search history for this exact URL, excluding the current visit
  const results = await chrome.history.search({
    text: "",
    startTime: 0,
    maxResults: 1
  });

  // getVisits gives us all visits to this specific URL
  const visits = await chrome.history.getVisits({ url });

  // If there are 2+ visits, the page was visited before this current load
  const alreadyVisited = visits.length >= 2;

  if (alreadyVisited) {
    chrome.tabs.sendMessage(details.tabId, { type: "ALREADY_VISITED" });
  }
});
