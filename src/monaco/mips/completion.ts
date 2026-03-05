import type * as Monaco from "monaco-editor";
import { DIRECTIVES, INSTRUCTIONS, REG_ALIASES } from "./mipsData";

export function registerMipsCompletion(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider("mips", {
    triggerCharacters: ["$", ".", " "],

    provideCompletionItems: (model, position) => {
      const line = model.getLineContent(position.lineNumber);
      const cursorIdx = position.column - 1; // 0-based
      const beforeCursor = line.slice(0, cursorIdx);

      // Detect "$", "$r", "$ra" right before cursor (real token boundary)
      const m = beforeCursor.match(/(?:^|[^A-Za-z0-9_])(\$[A-Za-z0-9_]*)$/);

      const word = model.getWordUntilPosition(position);
      const defaultRange = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn
      );

      const regRange = m
        ? new monaco.Range(
            position.lineNumber,
            position.column - m[1].length,
            position.lineNumber,
            position.column
          )
        : defaultRange;

      const regSuggestions = REG_ALIASES.map((r) => {
        const full = `$${r}`;
        return {
          label: full,
          kind: monaco.languages.CompletionItemKind.Variable,

          // required by typings
          insertText: full,
          range: regRange,

          // forces replacement of "$..." token -> prevents "$$ra"
          textEdit: { range: regRange, text: full },

          sortText: "0_" + full,
          filterText: full,
        };
      });

      // ✅ If typing a register token -> only registers
      if (m) return { suggestions: regSuggestions };

      const suggestions = [
        ...INSTRUCTIONS.map((k) => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range: defaultRange,
          sortText: "1_" + k,
          filterText: k,
        })),
        ...DIRECTIVES.map((d) => ({
          label: d,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: d,
          range: defaultRange,
          sortText: "2_" + d,
          filterText: d,
        })),
        ...regSuggestions,
      ];

      return { suggestions };
    },
  });
}