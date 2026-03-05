import React, { createContext, useContext, useMemo, useState } from "react";
import { initTheme, applyTheme, storeTheme, type Theme } from "@/ui/theme/theme";

type ThemeContextValue = {
  theme: Theme;
  themeMode: "dark" | "light";
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ✅ IMPORTANT: synchronous init on first render (no "dark first" flash)
  const [theme, setThemeState] = useState<Theme>(() => initTheme());

  const setTheme = (next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    storeTheme(next);
  };

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      themeMode: theme,
      setTheme,
      toggleTheme,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider />");
  return ctx;
}