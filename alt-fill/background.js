const ITEMS = [
  { id: "email", title: "Email" },
  { id: "phone", title: "Phone" },
  { id: "name", title: "Name" },
  { id: "linkedin", title: "LinkedIn" },
  { id: "github", title: "GitHub" },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "alt-fill",
    title: "Alt Fill",
    contexts: ["editable"],
  });
  for (const item of ITEMS) {
    chrome.contextMenus.create({
      id: "alt-fill:" + item.id,
      parentId: "alt-fill",
      title: item.title,
      contexts: ["editable"],
    });
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId.startsWith("alt-fill:") || !tab) return;
  const key = info.menuItemId.slice("alt-fill:".length);
  chrome.tabs.sendMessage(tab.id, { type: "ALT_FILL", key }, { frameId: info.frameId });
});
