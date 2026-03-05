import type * as Monaco from "monaco-editor";
import { INSTRUCTION_DOCS } from "./mipsData";

function getMnemonicFromLinePrefix(prefix: string): string | null {
  // Remove comment
  const noComment = prefix.split("#")[0] ?? "";
  const trimmed = noComment.trimStart();
  if (!trimmed) return null;

  // If there's a label at start: "loop:" then mnemonic follows
  const afterLabel = trimmed.replace(/^[A-Za-z_.$][\w.$]*:\s*/, "");

  const m = afterLabel.match(/^([A-Za-z_][\w.$]*)\b/);
  return m ? m[1].toLowerCase() : null;
}

export function registerMipsSignature(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerSignatureHelpProvider("mips", {
    signatureHelpTriggerCharacters: [" ", ","],
    signatureHelpRetriggerCharacters: [" ", ","],

    provideSignatureHelp: (model, position) => {
      const line = model.getLineContent(position.lineNumber);
      const prefix = line.slice(0, position.column - 1);

      const mnemonic = getMnemonicFromLinePrefix(prefix);
      if (!mnemonic) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => {} };
      }

      const doc = INSTRUCTION_DOCS[mnemonic];
      if (!doc) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose: () => {} };
      }

      // Count commas AFTER the mnemonic occurrence
      const idx = prefix.toLowerCase().indexOf(mnemonic);
      const afterMnemonic = idx >= 0 ? prefix.slice(idx + mnemonic.length) : prefix;
      const commaCount = (afterMnemonic.match(/,/g) ?? []).length;

      // Parse parameters from signature text: "add rd, rs, rt"
      const paramsPart = doc.sig.split(/\s+/).slice(1).join(" "); // "rd, rs, rt"
      const params = paramsPart
        ? paramsPart.split(",").map((p) => p.trim()).filter(Boolean)
        : [];

      const activeParam = params.length ? Math.min(commaCount, params.length - 1) : 0;

      return {
        value: {
          activeSignature: 0,
          activeParameter: activeParam,
          signatures: [
            {
              label: doc.sig,
              documentation: doc.summary,
              parameters: params.map((p) => ({ label: p })),
            },
          ],
        },
        dispose: () => {},
      };
    },
  });
}