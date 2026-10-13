/* global document, localStorage */
// Blocking head script: apply the saved theme before styles or React can paint.
// Keep the v1 storage key and validation aligned with lib/workspace.ts.
(function () {
  let theme = "dark";
  try {
    const saved = JSON.parse(localStorage.getItem("medical-workbench.preferences.v1"));
    if (saved && saved.version === 1 && saved.theme === "light") theme = "light";
  } catch { /* A blocked or damaged store keeps the original dark default. */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f5f1" : "#080f1b");
}());
