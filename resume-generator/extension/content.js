// Injected on demand by the popup via chrome.scripting.executeScript.
// Returns info scraped from the page.
(() => {
  const sel = window.getSelection()?.toString() ?? "";
  const snippet = sel.length > 0
    ? sel
    : (document.body?.innerText ?? "").slice(0, 2000);
  return {
    title: document.title,
    url: location.href,
    snippet,
    html_length: document.documentElement.outerHTML.length,
  };
})();
