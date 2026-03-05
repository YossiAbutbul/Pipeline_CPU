import type * as Monaco from "monaco-editor";
import { INSTRUCTION_DOCS, REG_INFO } from "./mipsData";

export function registerMipsHover(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerHoverProvider("mips", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const text = word.word;

      // Detect if this word is part of a register token "$<word>"
      const line = model.getLineContent(position.lineNumber);
      const wordStartIdx = word.startColumn - 1; // 0-based
      const hasDollar = wordStartIdx > 0 && line[wordStartIdx - 1] === "$";

      if (hasDollar && REG_INFO[text]) {
        const info = REG_INFO[text];
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn - 1, // include '$'
            position.lineNumber,
            word.endColumn
          ),
          contents: [
            { value: `### \`${"$" + text}\`  \`(r${info.num})\`` },
            { value: `${info.desc}` },
            { value: `---\n**Type:** Register` },
            ],
        };
      }

      // Instruction hover
      const ins = INSTRUCTION_DOCS[text.toLowerCase()];
      if (ins) {
        return {
            range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
            ),
            contents: [
                { value: `### \`${ins.sig}\`` },
                { value: `${ins.summary}` },
                { value: `---\n**Category:** Instruction` },
                ],
        };
      }

      // Directive hover (simple)
      if (text.startsWith(".")) {
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [{ value: `**${text}** directive` }],
        };
      }

      return null;
    },
  });
}