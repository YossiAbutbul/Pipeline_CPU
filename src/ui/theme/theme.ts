export type Theme = "dark" | "light";

const STORAGE_KEY = "pcv_theme";

export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "dark" || v === "light" ? v : null;
}

export function getSystemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function storeTheme(theme: Theme) {
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  const stored = getStoredTheme();
  const theme = stored ?? getSystemTheme();
  applyTheme(theme);
  return theme;
}