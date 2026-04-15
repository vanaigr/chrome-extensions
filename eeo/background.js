chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'autofill') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'eeo-autofill' });
  } catch (e) {
    // No content script on this page — inject a dispatcher that picks an algorithm by hostname.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['content.js'],
    });
    try { await chrome.tabs.sendMessage(tab.id, { type: 'eeo-autofill' }); } catch {}
  }
});
