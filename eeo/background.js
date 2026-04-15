// TODO: this one is not needed?
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'eeo-get-page-var') return;
  if (sender.tab?.id == null) { sendResponse({ value: undefined }); return; }
  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id, frameIds: [sender.frameId ?? 0] },
    world: 'MAIN',
    func: (name) => window[name],
    args: [msg.name],
  }).then((results) => {
    sendResponse({ value: results?.[0]?.result });
  }).catch(() => sendResponse({ value: undefined }));
  return true;
});

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
