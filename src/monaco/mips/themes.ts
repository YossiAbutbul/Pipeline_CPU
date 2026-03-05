import type * as Monaco from "monaco-editor";

export const MIPS_THEME_DARK = "mips-dark";
export const MIPS_THEME_LIGHT = "mips-light";

type ThemeMode = "dark" | "light";

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Accepts "#rrggbb" and adds alpha (0..1) => "#rrggbbaa"
function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return hex;
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${h}${a}`;
}

export function defineMipsThemeFromTokens(monaco: typeof Monaco, mode: ThemeMode) {
  // App tokens
  const bg = cssVar("--bg");
  const surface1 = cssVar("--surface-1");
  const surface2 = cssVar("--surface-2");
  const text = cssVar("--text");
  const muted = cssVar("--muted");
  const border = cssVar("--border");
  const accent = cssVar("--accent");

  const name = mode === "dark" ? MIPS_THEME_DARK : MIPS_THEME_LIGHT;
  const base = mode === "dark" ? "vs-dark" : "vs";

  // Fallbacks
  const _bg = bg || (mode === "dark" ? "#0f1115" : "#ffffff");
  const _surface1 = surface1 || (mode === "dark" ? "#14161b" : "#ffffff");
  const _surface2 = surface2 || (mode === "dark" ? "#1a1d24" : "#f4f6fb");
  const _text = text || (mode === "dark" ? "#e7e9ee" : "#111827");
  const _muted = muted || (mode === "dark" ? "#a6adba" : "#6b7280");
  const _border = border || (mode === "dark" ? "#2a2f3a" : "#cbd5e1");
  const _accent = accent || (mode === "dark" ? "#2f4f8f" : "#2f4f8f");

  // Nice readable widget selection backgrounds (slightly stronger than text selection)
  const suggestSelectedBg = withAlpha(_accent, mode === "dark" ? 0.28 : 0.20);

  // Cursor + selection tuning
  const selectionBg = withAlpha(_accent, mode === "dark" ? 0.26 : 0.18);
  const inactiveSelectionBg = withAlpha(_accent, mode === "dark" ? 0.16 : 0.10);

  // Line highlight that doesn't wash out text
  const lineHighlight = mode === "dark" ? withAlpha(_accent, 0.12) : withAlpha(_accent, 0.07);

  monaco.editor.defineTheme(name, {
    base,
    inherit: true,

    // Syntax colors (kept close to your current look, but improved contrast on light mode)
    rules: [
      { token: "comment", foreground: mode === "dark" ? "7A7A7A" : "6B7280" },
      { token: "keyword", foreground: mode === "dark" ? "4FC3F7" : "1e3a8a" },
      { token: "keyword.directive", foreground: mode === "dark" ? "B39DDB" : "6A1B9A" },
      { token: "variable.predefined", foreground: mode === "dark" ? "81C784" : "166534" },
      { token: "number", foreground: mode === "dark" ? "FFD54F" : "B45309" },
      { token: "number.hex", foreground: mode === "dark" ? "FFD54F" : "B45309" },
      { token: "string", foreground: mode === "dark" ? "FFAB91" : "B91C1C" },
      { token: "type.identifier", foreground: mode === "dark" ? "F48FB1" : "9D174D" },
    ],

    colors: {
      // Editor surfaces
      "editor.background": _surface1,
      "editorGutter.background": _surface1,

      // Text + caret
      "editor.foreground": _text,
      "editorCursor.foreground": _accent,

      // Line numbers
      "editorLineNumber.foreground": _muted,
      "editorLineNumber.activeForeground": _text,

      // Line highlight (subtle)
      "editor.lineHighlightBackground": lineHighlight,

      // Selection
      "editor.selectionBackground": selectionBg,
      "editor.inactiveSelectionBackground": inactiveSelectionBg,

      // Find / matches (nice, subtle)
      "editor.findMatchBackground": withAlpha(_accent, mode === "dark" ? 0.22 : 0.18),
      "editor.findMatchHighlightBackground": withAlpha(_accent, mode === "dark" ? 0.14 : 0.10),

      // Brackets
      "editorBracketMatch.background": withAlpha(_accent, mode === "dark" ? 0.20 : 0.14),
      "editorBracketMatch.border": _border,

      // Widgets base (hover + signature + suggest share these)
      "editorWidget.background": _surface1,
      "editorWidget.foreground": _text,
      "editorWidget.border": _border,

      // Hover widget
      "editorHoverWidget.background": _surface1,
      "editorHoverWidget.foreground": _text,
      "editorHoverWidget.border": _border,
      "editorHoverWidgetStatusBar.background": _surface1,

      // Suggest widget (completion list)
      "editorSuggestWidget.background": _surface1,
      "editorSuggestWidget.foreground": _text,
      "editorSuggestWidget.border": _border,

      // Selected row (this is the one you asked about)
      "editorSuggestWidget.selectedBackground": suggestSelectedBg,
      "editorSuggestWidget.selectedForeground": _text,

      // Row hover (helps in light mode a lot)
      "editorSuggestWidget.focusHighlightForeground": _accent,

      // Matched letters highlight
      "editorSuggestWidget.highlightForeground": _accent,

      // General chrome
      "editorGroup.emptyBackground": _bg || _surface1,

      // Optional: input boxes inside widgets (e.g., quick open / rename)
      "input.background": _surface2,
      "input.foreground": _text,
      "input.border": _border,
      "input.placeholderForeground": _muted,
      "inputOption.activeBorder": _accent,
    },
  });
}