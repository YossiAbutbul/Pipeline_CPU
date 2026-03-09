import type { MemoryRuleConfig } from "@/app/store/appStore";
import { evaluateMemoryFormula, parseSignedOrUnsigned32 } from "@/features/statePanels/memoryEditorModel";

export const MEMORY_WORD_COUNT = 0x1_0000;
export const MEMORY_BYTE_COUNT = MEMORY_WORD_COUNT * 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function evaluateByteFormula(formula: string, address: number): number {
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

  const wordIndex = Math.floor(address / 4);
  const resolved = constantMode
    ? expression
    : expression
        .replace(/\bindex\b/gi, String(address))
        .replace(/\bword\b/gi, String(wordIndex))
        .replace(/\b(address|addr)\b/gi, String(address))
        .replace(/\bi\b/g, String(address));

  const result = Function(`"use strict"; return (${resolved});`)();
  if (!Number.isFinite(result) || !Number.isInteger(result)) {
    throw new Error("Formula must produce an integer");
  }

  return (result as number) >>> 0;
}

export function readWord(memoryBytes: Uint8Array, address: number): number {
  const b0 = memoryBytes[address] ?? 0;
  const b1 = memoryBytes[address + 1] ?? 0;
  const b2 = memoryBytes[address + 2] ?? 0;
  const b3 = memoryBytes[address + 3] ?? 0;
  return (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0);
}

export function writeWord(memoryBytes: Uint8Array, address: number, value: number): void {
  const word = value >>> 0;
  memoryBytes[address] = (word >>> 24) & 0xff;
  memoryBytes[address + 1] = (word >>> 16) & 0xff;
  memoryBytes[address + 2] = (word >>> 8) & 0xff;
  memoryBytes[address + 3] = word & 0xff;
}

export function createMemoryFromRules(rules: MemoryRuleConfig[]): Uint8Array {
  const memoryBytes = new Uint8Array(MEMORY_BYTE_COUNT);

  for (const rule of rules) {
    if (rule.kind !== "range_fill") {
      continue;
    }

    if (rule.writeMode === "word") {
      const startWord = rule.fullRange ? 0 : clamp(rule.start, 0, MEMORY_WORD_COUNT - 1);
      const endWord = rule.fullRange ? MEMORY_WORD_COUNT - 1 : clamp(rule.end, 0, MEMORY_WORD_COUNT - 1);
      if (endWord < startWord) {
        continue;
      }

      for (let word = startWord; word <= endWord; word += 1) {
        const value = rule.useFormula
          ? evaluateMemoryFormula(rule.formulaText || "0", word)
          : parseSignedOrUnsigned32(rule.valueText || "0", "Value");
        writeWord(memoryBytes, word * 4, value);
      }
      continue;
    }

    const startAddress = rule.fullRange ? 0 : clamp(rule.start, 0, MEMORY_BYTE_COUNT - 1);
    const endAddress = rule.fullRange ? MEMORY_BYTE_COUNT - 1 : clamp(rule.end, 0, MEMORY_BYTE_COUNT - 1);
    if (endAddress < startAddress) {
      continue;
    }

    for (let address = startAddress; address <= endAddress; address += 1) {
      const value = rule.useFormula
        ? evaluateByteFormula(rule.formulaText || "0", address)
        : parseSignedOrUnsigned32(rule.valueText || "0", "Value");
      memoryBytes[address] = value & 0xff;
    }
  }

  return memoryBytes;
}
