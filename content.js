chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== "ALREADY_VISITED") return;

  // Don't show duplicate popups
  if (document.getElementById("already-visited-popup")) return;

  const popup = document.createElement("div");
  popup.id = "already-visited-popup";
  popup.textContent = "You already visited this page";

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
