import type * as Monaco from "monaco-editor";
import { registerMipsLanguageConfiguration, registerMipsTokenizer } from "./tokenizer";
import { registerMipsCompletion } from "./completion";
import { registerMipsHover } from "./hover";
import { registerMipsSignature } from "./signature";
import { defineMipsThemeFromTokens } from "./themes";

let didInit = false;

export type MipsMonacoDisposables = { dispose: () => void };

export function ensureMipsMonaco(monaco: typeof Monaco, mode: "dark" | "light") {
  if (!didInit) {
    if (!monaco.languages.getLanguages().some((l) => l.id === "mips")) {
      monaco.languages.register({ id: "mips" });
    }
    registerMipsLanguageConfiguration(monaco);
    registerMipsTokenizer(monaco);
    didInit = true;
  }

  // define (or redefine) theme from current CSS tokens
  defineMipsThemeFromTokens(monaco, mode);
}

export function setupMipsMonaco(monaco: typeof Monaco, mode: "dark" | "light"): MipsMonacoDisposables {
  ensureMipsMonaco(monaco, mode);

  const disposables: Monaco.IDisposable[] = [];
  disposables.push(registerMipsCompletion(monaco));
  disposables.push(registerMipsHover(monaco));
  disposables.push(registerMipsSignature(monaco));

  return { dispose: () => disposables.forEach((d) => d.dispose()) };
}
