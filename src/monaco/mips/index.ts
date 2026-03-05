import type * as Monaco from "monaco-editor";
import { defineMipsThemes } from "./themes";
import { registerMipsTokenizer } from "./tokenizer";
import { registerMipsCompletion } from "./completion";

let didInit = false;

export type MipsMonacoDisposables = { dispose: () => void };

export function setupMipsMonaco(monaco: typeof Monaco): MipsMonacoDisposables {
  if (!didInit) {
    if (!monaco.languages.getLanguages().some((l) => l.id === "mips")) {
      monaco.languages.register({ id: "mips" });
    }
    registerMipsTokenizer(monaco);
    defineMipsThemes(monaco);
    didInit = true;
  }

  const disposables: Monaco.IDisposable[] = [];
  disposables.push(registerMipsCompletion(monaco));

  return {
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}