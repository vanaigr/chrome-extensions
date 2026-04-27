function formatAgo(ts) {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 60) {
    const n = Math.max(1, diffMin);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "ALREADY_VISITED") return;

  if (document.getElementById("already-visited-popup")) return;

  const popup = document.createElement("div");
  popup.id = "already-visited-popup";
  const line1 = document.createElement("div");
  line1.textContent = "You already visited this page";
  popup.appendChild(line1);
  if (msg.lastVisit) {
    const line2 = document.createElement("div");
    line2.textContent = `Last visit: ${formatAgo(msg.lastVisit)}`;
    Object.assign(line2.style, { fontSize: "12px", fontWeight: "400", marginTop: "4px", opacity: "0.9" });
    popup.appendChild(line2);
  }

  Object.assign(popup.style, {
    position: "fixed",
    top: "16px",
    right: "16px",
    zIndex: "2147483647",
    background: "#dc2626",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "system-ui, sans-serif",
    fontWeight: "600",
    lineHeight: "1.4",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    cursor: "pointer",
    transition: "opacity 0.3s ease",
    opacity: "0"
  });

  popup.addEventListener("click", () => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 300);
  });

  document.documentElement.appendChild(popup);

  // Fade in
  requestAnimationFrame(() => {
    popup.style.opacity = "1";
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 300);
  }, 4000);
});
