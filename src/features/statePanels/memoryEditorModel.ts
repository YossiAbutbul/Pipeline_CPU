export type MemoryRuleKind =
  | "constant_range"
  | "formula_range"
  | "constant_all"
  | "neg_index_lower_n";

export type MemoryRule = {
  id: string;
  kind: MemoryRuleKind;
  startWord: number;
  wordCount: number;
  value?: number;
  formula?: string;
  label: string;
};

export function toHex32(value: number): string {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function parseWordNumber(raw: string, fieldName: string): number {
  const text = raw.trim();
  const parsed = text.toLowerCase().startsWith("0x") ? Number.parseInt(text, 16) : Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

export function parseSignedOrUnsigned32(raw: string, fieldName: string): number {
  const text = raw.trim();
  const parsed = text.toLowerCase().startsWith("0x") ? Number.parseInt(text, 16) : Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return parsed >>> 0;
}

export function evaluateMemoryFormula(formula: string, wordIndex: number): number {
  const normalized = formula.trim();
  if (!normalized) {
    throw new Error("Formula is empty");
  }

  const isSafe = /^[=0-9a-fxA-F+\-*/()%<>&|^~\sA-Za-z]+$/.test(normalized);
  if (!isSafe) {
    throw new Error("Formula contains unsupported characters");
  }

  const assignmentMatch = normalized.match(/^(index|word|address|addr|i)\s*=\s*(.+)$/i);
  const constantMode = normalized.startsWith("=") || Boolean(assignmentMatch);
  const expression = normalized.startsWith("=")
    ? normalized.slice(1).trim()
    : assignmentMatch
      ? assignmentMatch[2].trim()
      : normalized;

  if (!expression) {
    throw new Error("Formula is empty");
  }

  const byteAddress = wordIndex * 4;
  const resolved = constantMode
    ? expression
    : expression
        .replace(/\b(index|word)\b/gi, String(wordIndex))
        .replace(/\b(address|addr)\b/gi, String(byteAddress))
        .replace(/\bi\b/g, String(wordIndex));

  const result = Function(`"use strict"; return (${resolved});`)();
  if (!Number.isFinite(result) || !Number.isInteger(result)) {
    throw new Error("Formula must produce an integer");
  }

  return (result as number) >>> 0;
}

export function clampRuleToMemory(rule: MemoryRule, memoryWords: number): MemoryRule {
  const start = Math.min(Math.max(rule.startWord, 0), Math.max(memoryWords - 1, 0));
  const maxCount = Math.max(memoryWords - start, 0);
  const count = Math.min(Math.max(rule.wordCount, 0), maxCount);
  return { ...rule, startWord: start, wordCount: count };
}

export function applyMemoryRules(
  memoryWords: number,
  rules: MemoryRule[],
): Uint32Array {
  const memory = new Uint32Array(memoryWords);

  for (const rawRule of rules) {
    const rule = clampRuleToMemory(rawRule, memoryWords);
    if (rule.wordCount <= 0) {
      continue;
    }

    if (rule.kind === "constant_all" || rule.kind === "constant_range") {
      const fillValue = rule.value ?? 0;
      const end = rule.startWord + rule.wordCount;
      for (let index = rule.startWord; index < end; index += 1) {
        memory[index] = fillValue;
      }
      continue;
    }

    if (rule.kind === "neg_index_lower_n") {
      const end = rule.startWord + rule.wordCount;
      for (let index = rule.startWord; index < end; index += 1) {
        memory[index] = (-index) >>> 0;
      }
      continue;
    }

    const end = rule.startWord + rule.wordCount;
    for (let index = rule.startWord; index < end; index += 1) {
      memory[index] = evaluateMemoryFormula(rule.formula ?? "0", index);
    }
  }

  return memory;
}
