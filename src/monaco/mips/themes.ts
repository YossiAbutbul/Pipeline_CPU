import type * as Monaco from "monaco-editor";

export const MIPS_THEME_DARK = "mips-dark";
export const MIPS_THEME_LIGHT = "mips-light";

export function defineMipsThemes(monaco: typeof Monaco) {
  monaco.editor.defineTheme(MIPS_THEME_DARK, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7A7A7A" },
      { token: "keyword", foreground: "4FC3F7" },
      { token: "keyword.directive", foreground: "B39DDB" },
      { token: "variable.predefined", foreground: "81C784" },
      { token: "number", foreground: "FFD54F" },
      { token: "number.hex", foreground: "FFD54F" },
      { token: "string", foreground: "FFAB91" },
      { token: "type.identifier", foreground: "F48FB1" },
    ],
    colors: {
      "editor.background": "#0f1115",
      "editorGutter.background": "#0f1115",
      "editor.lineHighlightBackground": "#1f2633",
      "editor.selectionBackground": "#264f7844",
      "editor.inactiveSelectionBackground": "#264f7822",
      "editorLineNumber.foreground": "#8a93a6",
      "editorLineNumber.activeForeground": "#c9d1d9",
    },
  });

  monaco.editor.defineTheme(MIPS_THEME_LIGHT, {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "7A7A7A" },
      { token: "keyword", foreground: "1565C0" },
      { token: "keyword.directive", foreground: "6A1B9A" },
      { token: "variable.predefined", foreground: "2E7D32" },
      { token: "number", foreground: "EF6C00" },
      { token: "number.hex", foreground: "EF6C00" },
      { token: "string", foreground: "C62828" },
      { token: "type.identifier", foreground: "AD1457" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editorGutter.background": "#ffffff",
      "editor.lineHighlightBackground": "#f0f4f9",
      "editor.selectionBackground": "#264f7826",
      "editor.inactiveSelectionBackground": "#264f7817",
      "editorLineNumber.foreground": "#6b7280",
      "editorLineNumber.activeForeground": "#111827",
    },
  });
}