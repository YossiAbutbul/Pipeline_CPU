import type { MemoryRuleConfig } from "@/app/store/appStore";
import { evaluateMemoryFormula, parseSignedOrUnsigned32 } from "@/features/statePanels/memoryEditorModel";
import type { SparseMemoryWords } from "./types";

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

export function readWord(memoryWords: SparseMemoryWords, address: number): number {
  if (address < 0 || address % 4 !== 0) {
    return 0;
  }
  const wordIndex = address >>> 2;
  return (memoryWords.get(wordIndex) ?? 0) >>> 0;
}

export function writeWord(memoryWords: SparseMemoryWords, address: number, value: number): void {
  if (address < 0 || address % 4 !== 0) {
    return;
  }
  const wordIndex = address >>> 2;
  const normalized = value >>> 0;
  if (normalized === 0) {
    memoryWords.delete(wordIndex);
    return;
  }
  memoryWords.set(wordIndex, normalized);
}

function readByte(memoryWords: SparseMemoryWords, address: number): number {
  if (address < 0 || address >= MEMORY_BYTE_COUNT) {
    return 0;
  }
  const wordAddress = address & ~0x3;
  const shift = (3 - (address & 0x3)) * 8;
  return (readWord(memoryWords, wordAddress) >>> shift) & 0xff;
}

function writeByte(memoryWords: SparseMemoryWords, address: number, value: number): void {
  if (address < 0 || address >= MEMORY_BYTE_COUNT) {
    return;
  }
  const wordAddress = address & ~0x3;
  const shift = (3 - (address & 0x3)) * 8;
  const mask = ~(0xff << shift);
  const prev = readWord(memoryWords, wordAddress);
  const next = ((prev & mask) | ((value & 0xff) << shift)) >>> 0;
  writeWord(memoryWords, wordAddress, next);
}

export function createMemoryFromRules(rules: MemoryRuleConfig[]): SparseMemoryWords {
  const memoryWords: SparseMemoryWords = new Map();

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
        if ((value >>> 0) !== 0) {
          memoryWords.set(word, value >>> 0);
        } else {
          memoryWords.delete(word);
        }
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
      const prevByte = readByte(memoryWords, address);
      const nextByte = value & 0xff;
      if (prevByte !== nextByte) {
        writeByte(memoryWords, address, nextByte);
      }
    }
  }

  return memoryWords;
}
