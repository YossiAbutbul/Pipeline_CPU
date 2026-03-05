import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useMemo, useRef } from "react";

import { setupMipsMonaco, type MipsMonacoDisposables } from "@/monaco/mips";
import { MIPS_THEME_DARK, MIPS_THEME_LIGHT } from "@/monaco/mips/themes";
import "@/monaco/mips/style.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  themeMode: "dark" | "light";
  height?: string | number;
};

export function MipsMonaco({ value, onChange, themeMode, height = "100%" }: Props) {
  const monaco = useMonaco();
  const theme = useMemo(
    () => (themeMode === "dark" ? MIPS_THEME_DARK : MIPS_THEME_LIGHT),
    [themeMode]
  );

  const disposablesRef = useRef<MipsMonacoDisposables | null>(null);

  useEffect(() => {
    if (!monaco) return;

    // Ensure we don't accumulate providers across remounts
    disposablesRef.current?.dispose();
    disposablesRef.current = setupMipsMonaco(monaco);

    return () => {
      disposablesRef.current?.dispose();
      disposablesRef.current = null;
    };
  }, [monaco]);

  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(theme);
  }, [monaco, theme]);

  return (
    <Editor
      height={height}
      language="mips"
      theme={theme}
      path="mips://program"
      keepCurrentModel
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={(_editor, m) => {
        disposablesRef.current?.dispose();
        disposablesRef.current = setupMipsMonaco(m);
        m.editor.setTheme(theme);
      }}
      options={{
        minimap: { enabled: false },
        "semanticHighlighting.enabled": false,

        // reduce noisy suggestions from "words in document"
        suggest: { showWords: false },
        suggestOnTriggerCharacters: true,
        quickSuggestions: {                
          other: true,
          comments: false,
          strings: false,
        },

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
          horizontal: "auto",
          verticalScrollbarSize: 4,
          horizontalScrollbarSize: 4,
          useShadows: false,
          alwaysConsumeMouseWheel: false,
        },

        renderLineHighlight: "all",
        renderLineHighlightOnlyWhenFocus: false,

        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,

        fontSize: 14,
        lineHeight: 20,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',

        tabSize: 2,
        insertSpaces: true,
      }}
    />
  );
}