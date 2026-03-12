import type { ParsedInstruction } from "./types";

type ParsedProgram = {
  instructions: ParsedInstruction[];
  labels: Record<string, number>;
};

type ParseProgramOptions = {
  initialPc?: number;
};

function stripComment(line: string): string {
  const hashIdx = line.indexOf("#");
  if (hashIdx === -1) {
    return line;
  }
  return line.slice(0, hashIdx);
}

function splitOperands(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseProgram(program: string, options: ParseProgramOptions = {}): ParsedProgram {
  const labels: Record<string, number> = {};
  const entries: Array<{ text: string; lineNumber: number; pc: number }> = [];
  let pc = options.initialPc ?? 0;

  const lines = program.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    let text = stripComment(lines[i]).trim();
    if (!text) {
      continue;
    }

    while (true) {
      const labelMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
      if (!labelMatch) {
        break;
      }
      const label = labelMatch[1];
      if (typeof labels[label] === "number") {
        throw new Error(`Line ${lineNumber}: duplicate label "${label}"`);
      }
      labels[label] = pc;
      text = labelMatch[2].trim();
      if (!text) {
        break;
      }
    }

    if (!text || text.startsWith(".")) {
      continue;
    }

    entries.push({ text, lineNumber, pc });
    pc += 4;
  }

  const instructions: ParsedInstruction[] = entries.map(({ text, lineNumber, pc: entryPc }) => {
    const [mnemonicRaw, ...rest] = text.split(/\s+/);
    const mnemonic = mnemonicRaw.toLowerCase();
    const operands = splitOperands(rest.join(" "));
    return {
      source: text,
      mnemonic,
      operands,
      lineNumber,
      pc: entryPc,
    };
  });

  return { instructions, labels };
}
