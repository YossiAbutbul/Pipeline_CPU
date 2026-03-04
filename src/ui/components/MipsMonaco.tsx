import Editor, { useMonaco } from "@monaco-editor/react";
import { useEffect, useMemo, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  themeMode: "dark" | "light";
  height?: string | number;
};

const INSTRUCTIONS = [
  "add","addu","sub","subu","and","or","xor","nor","slt","sltu",
  "sll","srl","sra","sllv","srlv","srav",
  "mult","multu","div","divu","mfhi","mflo","mthi","mtlo",
  "jr","jalr",
  "addi","addiu","andi","ori","xori","slti","sltiu","lui",
  "lw","sw","lb","lbu","lh","lhu","sb","sh",
  "beq","bne","blez","bgtz","bltz","bgez","j","jal",
  "move","li","la","nop",
  "syscall","break",
];

const DIRECTIVES = [
  ".data",".text",".globl",".global",".word",".half",".byte",".asciiz",".ascii",".space",".align",
];

const REG_ALIASES = [
  "zero","at","v0","v1","a0","a1","a2","a3",
  "t0","t1","t2","t3","t4","t5","t6","t7","t8","t9",
  "s0","s1","s2","s3","s4","s5","s6","s7",
  "k0","k1","gp","sp","fp","ra",
];

export function MipsMonaco({ value, onChange, themeMode, height = "100%" }: Props) {
  const monaco = useMonaco();
  const theme = useMemo(() => (themeMode === "dark" ? "mips-dark" : "mips-light"), [themeMode]);

  // prevent double registration (StrictMode mounts twice in dev)
  const didInitRef = useRef(false);

  // 1) One-time language + providers + themes
  useEffect(() => {
    if (!monaco) return;
    if (didInitRef.current) return;
    didInitRef.current = true;

    // Language
    if (!monaco.languages.getLanguages().some((l) => l.id === "mips")) {
      monaco.languages.register({ id: "mips" });
    }

    monaco.languages.setMonarchTokensProvider("mips", {
      defaultToken: "",
      tokenPostfix: ".mips",
      ignoreCase: true,
      keywords: INSTRUCTIONS,
      directives: DIRECTIVES,
      tokenizer: {
        root: [
          [/#[^\n]*/, "comment"],
          [/^[ \t]*[A-Za-z_.$][\w.$]*:/, "type.identifier"],
          [/\.[A-Za-z_]+\b/, { cases: { "@directives": "keyword.directive", "@default": "keyword.directive" } }],
          [/\$([0-9]+|[A-Za-z_][A-Za-z0-9_]*)\b/, "variable.predefined"],
          [/-?0x[0-9a-fA-F]+\b/, "number.hex"],
          [/-?\d+\b/, "number"],
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string"],
          [/[A-Za-z_][\w.$]*\b/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
          [/[(),]/, "delimiter"],
          [/[+\-*/]/, "operator"],
          [/[ \t\r\n]+/, ""],
        ],
        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
      },
    });

    // Completion provider
    const completionDisposable = monaco.languages.registerCompletionItemProvider("mips", {
      triggerCharacters: ["$", ".", " "],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          ...INSTRUCTIONS.map((k) => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k,
            range,
            sortText: "1_" + k,
            filterText: k,
          })),
          ...DIRECTIVES.map((d) => ({
            label: d,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: d,
            range,
            sortText: "2_" + d,
            filterText: d,
          })),
          ...REG_ALIASES.map((r) => {
            const label = `$${r}`;
            return {
              label,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: label,
              range,
              sortText: "3_" + label,
              filterText: label,
            };
          }),
        ];

        return { suggestions };
      },
    });

    // Themes
    monaco.editor.defineTheme("mips-dark", {
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

    monaco.editor.defineTheme("mips-light", {
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

    return () => {
      completionDisposable.dispose();
    };
  }, [monaco]);

  // Apply theme whenever themeMode changes
  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(theme);
  }, [monaco, theme]);

  return (
    <Editor
      height={height}
      language="mips"
      theme={theme}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={(_editor, m) => {
        m.editor.setTheme(theme);
      }}
      options={{
        minimap: { enabled: false },
        "semanticHighlighting.enabled": false,

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