import type { ThemeMode } from "./workspace";

export function applyTheme(theme: ThemeMode, target: Document = document): void {
  target.documentElement.dataset.theme = theme;
  target.documentElement.style.colorScheme = theme;
  target.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#f6f5f1" : "#080f1b");
}
