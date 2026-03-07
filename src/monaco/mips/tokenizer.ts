import type * as Monaco from "monaco-editor";
import { DIRECTIVES, INSTRUCTIONS } from "./mipsData";

export function registerMipsLanguageConfiguration(monaco: typeof Monaco) {
  monaco.languages.setLanguageConfiguration("mips", {
    comments: {
      lineComment: "#",
    },
    brackets: [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"', notIn: ["string", "comment"] },
      { open: "'", close: "'", notIn: ["string", "comment"] },
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });
}

export function registerMipsTokenizer(monaco: typeof Monaco) {
  monaco.languages.setMonarchTokensProvider("mips", {
    defaultToken: "",
    tokenPostfix: ".mips",
    ignoreCase: true,
    keywords: [...INSTRUCTIONS],
    directives: [...DIRECTIVES],
    tokenizer: {
      root: [
        [/#[^\n]*/, "comment"],
        [/^[ \t]*[A-Za-z_.$][\w.$]*:/, "type.identifier"],
        [/\.[A-Za-z_]+\b/, { cases: { "@directives": "keyword.directive", "@default": "keyword.directive" } }],
        [/\$(?:[0-9]|[12][0-9]|3[01])\b/, "register"],
        [/\$[A-Za-z_][A-Za-z0-9_]*\b/, "register"],
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
}
