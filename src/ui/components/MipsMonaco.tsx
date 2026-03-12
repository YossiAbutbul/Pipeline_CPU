import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useRef } from "react";
import { setupMipsMonaco, type MipsMonacoDisposables } from "@/monaco/mips";
import { MIPS_THEME_DARK, MIPS_THEME_LIGHT, defineMipsThemeFromTokens } from "@/monaco/mips/themes";
import "@/monaco/mips/style.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  themeMode: "dark" | "light";
  height?: string | number;
};

export function MipsMonaco({ value, onChange, themeMode, height = "100%" }: Props) {
  const theme = useMemo(
    () => (themeMode === "dark" ? MIPS_THEME_DARK : MIPS_THEME_LIGHT),
    [themeMode]
  );

  const disposablesRef = useRef<MipsMonacoDisposables | null>(null);
  const monacoRef = useRef<Parameters<NonNullable<React.ComponentProps<typeof Editor>["onMount"]>>[1] | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current?.dispose();
      disposablesRef.current = null;
      monacoRef.current = null;
    };
  }, []);

  // When themeMode changes, refresh Monaco theme colors from CSS tokens
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Recompute theme from current CSS variables (data-theme already changed by ThemeProvider)
    defineMipsThemeFromTokens(monaco as any, themeMode);
    monaco.editor.setTheme(theme);
  }, [themeMode, theme]);

  return (
    <Editor
      height={height}
      language="mips"
      theme={theme}
      path="mips://program"
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={(_editor, monaco) => {
        monacoRef.current = monaco;

        // Register language/providers once per mount (and avoid duplicates)
        disposablesRef.current?.dispose();
        disposablesRef.current = setupMipsMonaco(monaco as any, themeMode);

        // Define theme from current tokens + apply
        defineMipsThemeFromTokens(monaco as any, themeMode);
        monaco.editor.setTheme(theme);
      }}
      options={{
        minimap: { enabled: false },
        "semanticHighlighting.enabled": false,

        // reduce noisy suggestions from "words in document"
        suggest: { showWords: false },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: false },
        quickSuggestionsDelay: 40,

        hover: { enabled: true, delay: 150 },
        parameterHints: { enabled: true },

        glyphMargin: false,
        folding: false,
        guides: { indentation: false },
        renderWhitespace: "none",
        renderControlCharacters: false,

        fixedOverflowWidgets: true,
        scrollBeyondLastLine: false,
        automaticLayout: true,

        lineDecorationsWidth: 15,
        lineNumbersMinChars: 4,
        lineNumbers: "on",

        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,

        occurrencesHighlight: "off",
        selectionHighlight: false,
        matchBrackets: "near",

        scrollbar: {
          vertical: "auto",
          horizontal: "hidden",
          verticalHasArrows: false,
          verticalScrollbarSize: 0,
          horizontalScrollbarSize: 0,
          useShadows: false,
          alwaysConsumeMouseWheel: false,
        },

        renderLineHighlight: "all",
        renderLineHighlightOnlyWhenFocus: false,
        padding: {
          top: 10,
        },

        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,

        fontSize: 18,
        lineHeight: 26,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',

        wordWrap: "on",
        wordWrapColumn: 120,
        tabSize: 2,
        insertSpaces: true,
      }}
    />
  );
}
