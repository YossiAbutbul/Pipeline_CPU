import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import { applySignalComponentToNumber, type ActiveSignalComponent } from "@/features/components/placement/componentSignalRuntime";
import { parseRegisterValue } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "../core/parse";
import { MEMORY_BYTE_COUNT, readWord, writeWord } from "../runtime/memoryRuntime";
import type { MemoryWordDelta, SparseMemoryWords, StageEffect } from "../core/types";
import { createRuntimeStageError } from "./runtimeError";

type MemoryStageResult = {
  memoryWords: SparseMemoryWords;
  effect: StageEffect | null;
  changedMemoryWords: number[];
  deltas: MemoryWordDelta[];
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
  memoryWords: SparseMemoryWords,
  activeSignalComponent: ActiveSignalComponent = null,
): MemoryStageResult {
  if (!instruction) {
    return { memoryWords, effect: null, changedMemoryWords: [], deltas: [] };
  }

  const { mnemonic, operands } = instruction;

  if (mnemonic === "sw") {
    if (operands.length !== 2) {
      return { memoryWords, effect: null, changedMemoryWords: [], deltas: [] };
    }

    const rt = parseRegister(operands[0]);
    const { offset, base } = parseMemoryOperand(operands[1]);
    const address = applySignalComponentToNumber(
      activeSignalComponent,
      activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "memoryAddress",
      (getRegisterValue(registerValues, base) + offset) >>> 0,
    ) ?? 0;
    if (address % 4 !== 0) {
      throw createRuntimeStageError("MEM", instruction, `unaligned word store at address ${address}`);
    }
    if (address < 0 || address > MEMORY_BYTE_COUNT - 4) {
      throw createRuntimeStageError("MEM", instruction, `memory store out of range at address ${address}`);
    }

    const currentValue = readWord(memoryWords, address);
    const nextValue = applySignalComponentToNumber(
      activeSignalComponent,
      "memoryWriteData",
      getRegisterValue(registerValues, rt),
    ) ?? 0;
    if (currentValue === nextValue) {
      return { memoryWords, effect: null, changedMemoryWords: [], deltas: [] };
    }

    const nextMemory = new Map(memoryWords);
    writeWord(nextMemory, address, nextValue);
    return {
      memoryWords: nextMemory,
      effect: null,
      changedMemoryWords: [address / 4],
      deltas: [
        {
          wordIndex: address / 4,
          previousValue: currentValue,
          nextValue,
        },
      ],
    };
  }

  if (mnemonic === "lw") {
    if (operands.length !== 2) {
      return { memoryWords, effect: null, changedMemoryWords: [], deltas: [] };
    }

    const rt = parseRegister(operands[0]);
    const { offset, base } = parseMemoryOperand(operands[1]);
    const address = applySignalComponentToNumber(
      activeSignalComponent,
      activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "memoryAddress",
      (getRegisterValue(registerValues, base) + offset) >>> 0,
    ) ?? 0;
    if (address % 4 !== 0) {
      throw createRuntimeStageError("MEM", instruction, `unaligned word load at address ${address}`);
    }
    if (address < 0 || address > MEMORY_BYTE_COUNT - 4) {
      throw createRuntimeStageError("MEM", instruction, `memory load out of range at address ${address}`);
    }

    return {
      memoryWords,
      effect: {
        wbWrite: {
          registerNumber: rt,
          value:
            applySignalComponentToNumber(activeSignalComponent, "memoryReadData", readWord(memoryWords, address)) ??
            readWord(memoryWords, address),
        },
      },
      changedMemoryWords: [],
      deltas: [],
    };
  }

  return { memoryWords, effect: null, changedMemoryWords: [], deltas: [] };
}
