import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import { parseRegisterValue } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "./parse";
import { readWord, writeWord } from "./memoryRuntime";
import type { StageEffect } from "./types";

type MemoryStageResult = {
  memoryBytes: Uint8Array;
  effect: StageEffect | null;
};

const REGISTER_ALIAS_BY_NUMBER: Record<number, string> = {
  0: "zero",
  1: "at",
  2: "v0",
  3: "v1",
  4: "a0",
  5: "a1",
  6: "a2",
  7: "a3",
  8: "t0",
  9: "t1",
  10: "t2",
  11: "t3",
  12: "t4",
  13: "t5",
  14: "t6",
  15: "t7",
  16: "s0",
  17: "s1",
  18: "s2",
  19: "s3",
  20: "s4",
  21: "s5",
  22: "s6",
  23: "s7",
  24: "t8",
  25: "t9",
  26: "k0",
  27: "k1",
  28: "gp",
  29: "sp",
  30: "fp",
  31: "ra",
};

function getRegisterValue(values: Record<string, string>, registerNumber: number): number {
  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return 0;
  }
  return parseRegisterValue(values[alias] ?? "0");
}

function parseMemoryOperand(token: string): { offset: number; base: number } {
  const match = token.trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
  if (!match) {
    throw new Error(`Invalid memory operand "${token}"`);
  }
  return {
    offset: parseImmediate(match[1]),
    base: parseRegister(match[2].trim()),
  };
}

export function runMemoryStage(
  instruction: ParsedInstruction | null,
  registerValues: Record<string, string>,
  memoryBytes: Uint8Array,
): MemoryStageResult {
  if (!instruction) {
    return { memoryBytes, effect: null };
  }

  const { mnemonic, operands } = instruction;

  try {
    if (mnemonic === "sw") {
      if (operands.length !== 2) {
        return { memoryBytes, effect: null };
      }

      const rt = parseRegister(operands[0]);
      const { offset, base } = parseMemoryOperand(operands[1]);
      const address = (getRegisterValue(registerValues, base) + offset) >>> 0;
      if (address % 4 !== 0 || address + 3 >= memoryBytes.length) {
        return { memoryBytes, effect: null };
      }

      const nextMemory = memoryBytes.slice();
      writeWord(nextMemory, address, getRegisterValue(registerValues, rt));
      return { memoryBytes: nextMemory, effect: null };
    }

    if (mnemonic === "lw") {
      if (operands.length !== 2) {
        return { memoryBytes, effect: null };
      }

      const rt = parseRegister(operands[0]);
      const { offset, base } = parseMemoryOperand(operands[1]);
      const address = (getRegisterValue(registerValues, base) + offset) >>> 0;
      if (address % 4 !== 0 || address + 3 >= memoryBytes.length) {
        return { memoryBytes, effect: null };
      }

      return {
        memoryBytes,
        effect: {
          wbWrite: {
            registerNumber: rt,
            value: readWord(memoryBytes, address),
          },
        },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Pipeline] MEM execution skipped for "${instruction.source}": ${message}`);
  }

  return { memoryBytes, effect: null };
}
