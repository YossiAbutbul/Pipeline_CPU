import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import type { PipelineEffectSlots, PipelineInstructionSlots, StageEffect, SparseMemoryWords } from "../core/types";
import { REG_INFO } from "@/monaco/mips/mipsData";
import { parseRegisterValue, toHex32 } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "../core/parse";
import type { HoveredSignalValues } from "@/features/pipelineCanvas/pipelineHoverMap";
import { readWord } from "../runtime/memoryRuntime";

export type PipelineSignalValues = HoveredSignalValues;

const REGISTER_ALIAS_BY_NUMBER = Object.entries(REG_INFO).reduce<Record<number, string>>((acc, [alias, info]) => {
  acc[info.num] = alias;
  return acc;
}, {});

function toHex8(value: number): string {
  return `0x${(value & 0xff).toString(16).toUpperCase().padStart(2, "0")}`;
}

function parseMemoryBaseRegister(operand: string): number | null {
  const match = operand.trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return parseRegister(match[2].trim());
}

function getIdReadRegisterNumbers(instruction: ParsedInstruction | null): [number | null, number | null] {
  if (!instruction) {
    return [null, null];
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), parseRegister(operands[2])];
    }
    if (["sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[2]), parseRegister(operands[1])];
    }
    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      return [null, parseRegister(operands[1])];
    }
    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), null];
    }
    if (mnemonic === "move" && operands.length === 2) {
      return [parseRegister(operands[1]), null];
    }
    if (["lw", "lb", "lbu", "lh", "lhu"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), null];
    }
    if (["sw", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), parseRegister(operands[0])];
    }
    if ((mnemonic === "beq" || mnemonic === "bne") && operands.length === 3) {
      return [parseRegister(operands[0]), parseRegister(operands[1])];
    }
    if (["blez", "bgtz", "bltz", "bgez", "jr"].includes(mnemonic) && operands.length >= 1) {
      return [parseRegister(operands[0]), null];
    }
    if (mnemonic === "jalr") {
      if (operands.length === 1) {
        return [parseRegister(operands[0]), null];
      }
      if (operands.length === 2) {
        return [parseRegister(operands[1]), null];
      }
    }
    if (["mult", "multu", "div", "divu"].includes(mnemonic) && operands.length === 2) {
      return [parseRegister(operands[0]), parseRegister(operands[1])];
    }
    if (["mthi", "mtlo"].includes(mnemonic) && operands.length === 1) {
      return [parseRegister(operands[0]), null];
    }
  } catch {
    return [null, null];
  }

  return [null, null];
}

function getRegisterHexValue(values: Record<string, string>, registerNumber: number | null): string | undefined {
  if (registerNumber === null) {
    return undefined;
  }

  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return undefined;
  }

  try {
    return toHex32(parseRegisterValue(values[alias] ?? "0"));
  } catch {
    return undefined;
  }
}

function getIdImmediateValues(instruction: ParsedInstruction | null): {
  imm16Value?: string;
  signExtendedImmValue?: string;
} {
  if (!instruction) {
    return {};
  }

  const { mnemonic, operands } = instruction;

  try {
    let immediate: number | null = null;

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      immediate = parseImmediate(operands[2]);
    } else if (mnemonic === "lui" && operands.length === 2) {
      immediate = parseImmediate(operands[1]);
    } else if (["lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      const match = operands[1].trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
      immediate = match ? parseImmediate(match[1]) : null;
    } else if (["beq", "bne"].includes(mnemonic) && operands.length === 3) {
      immediate = parseImmediate(operands[2]);
    } else if (["blez", "bgtz", "bltz", "bgez"].includes(mnemonic) && operands.length >= 2) {
      immediate = parseImmediate(operands[1]);
    } else if (mnemonic === "li" && operands.length === 2) {
      immediate = parseImmediate(operands[1]);
    }

    if (immediate === null) {
      return {};
    }

    const imm16 = immediate & 0xffff;
    const signExtended = ((imm16 << 16) >> 16) >>> 0;

    return {
      imm16Value: toHex32(imm16),
      signExtendedImmValue: toHex32(signExtended),
    };
  } catch {
    return {};
  }
}

function getRegisterNumericValue(values: Record<string, string>, registerNumber: number | null): number | null {
  if (registerNumber === null) {
    return null;
  }

  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return null;
  }

  try {
    return parseRegisterValue(values[alias] ?? "0");
  } catch {
    return null;
  }
}

function getExSignalValues(
  instruction: ParsedInstruction | null,
  values: Record<string, string>,
): {
  aluInputA?: string;
  aluInputB?: string;
  aluResult?: string;
} {
  if (!instruction) {
    return {};
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      const a = getRegisterNumericValue(values, parseRegister(operands[1]));
      const b = getRegisterNumericValue(values, parseRegister(operands[2]));
      if (a === null || b === null) {
        return {};
      }
      const result =
        mnemonic === "add" || mnemonic === "addu"
          ? (a + b) >>> 0
          : mnemonic === "sub" || mnemonic === "subu"
            ? (a - b) >>> 0
            : mnemonic === "and"
              ? a & b
              : mnemonic === "or"
                ? a | b
                : mnemonic === "xor"
                  ? a ^ b
                  : mnemonic === "nor"
                    ? (~(a | b)) >>> 0
                    : mnemonic === "slt"
                      ? (a >> 0) < (b >> 0)
                        ? 1
                        : 0
                      : a < b
                        ? 1
                        : 0;

      return { aluInputA: toHex32(a), aluInputB: toHex32(b), aluResult: toHex32(result) };
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      const a = getRegisterNumericValue(values, parseRegister(operands[1]));
      const imm = parseImmediate(operands[2]);
      if (a === null) {
        return {};
      }
      const signExtendedImm = ((imm & 0xffff) << 16 >> 16) >>> 0;
      const zeroExtendedImm = imm & 0xffff;
      const b = ["andi", "ori", "xori", "sltiu"].includes(mnemonic) ? zeroExtendedImm >>> 0 : signExtendedImm;
      const result =
        mnemonic === "addi" || mnemonic === "addiu"
          ? (a + signExtendedImm) >>> 0
          : mnemonic === "andi"
            ? a & zeroExtendedImm
            : mnemonic === "ori"
              ? a | zeroExtendedImm
              : mnemonic === "xori"
                ? a ^ zeroExtendedImm
                : mnemonic === "slti"
                  ? (a >> 0) < (signExtendedImm >> 0)
                    ? 1
                    : 0
                  : a < (zeroExtendedImm >>> 0)
                    ? 1
                    : 0;

      return { aluInputA: toHex32(a), aluInputB: toHex32(b), aluResult: toHex32(result) };
    }

    if (["lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      const match = operands[1].trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
      if (!match) {
        return {};
      }
      const offset = parseImmediate(match[1]);
      const base = getRegisterNumericValue(values, parseRegister(match[2].trim()));
      if (base === null) {
        return {};
      }
      const signExtendedOffset = ((offset & 0xffff) << 16 >> 16) >>> 0;
      const address = (base + signExtendedOffset) >>> 0;
      return { aluInputA: toHex32(base), aluInputB: toHex32(signExtendedOffset), aluResult: toHex32(address) };
    }

    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      const rt = getRegisterNumericValue(values, parseRegister(operands[1]));
      const shamt = parseImmediate(operands[2]) & 0x1f;
      if (rt === null) {
        return {};
      }
      const result = mnemonic === "sll" ? (rt << shamt) >>> 0 : mnemonic === "srl" ? rt >>> shamt : (rt >> shamt) >>> 0;
      return { aluInputA: toHex32(rt), aluInputB: toHex32(shamt), aluResult: toHex32(result) };
    }
  } catch {
    return {};
  }

  return {};
}

function getWriteBackRegisterNumber(instruction: ParsedInstruction | null, effect: StageEffect | null): number | null {
  if (effect?.wbWrite) {
    return effect.wbWrite.registerNumber;
  }

  if (!instruction) {
    return null;
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      return parseRegister(operands[0]);
    }
    if (["sll", "srl", "sra", "sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
      return parseRegister(operands[0]);
    }
    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu", "lui", "li"].includes(mnemonic) && operands.length >= 1) {
      return parseRegister(operands[0]);
    }
    if (mnemonic === "move" && operands.length === 2) {
      return parseRegister(operands[0]);
    }
  } catch {
    return null;
  }

  return null;
}

function getWbSignalValues(
  instruction: ParsedInstruction | null,
  effect: StageEffect | null,
  values: Record<string, string>,
  memoryWords: SparseMemoryWords,
): {
  writeBackValue?: string;
  writeBackDest?: string;
} {
  if (!instruction && !effect?.wbWrite) {
    return {};
  }

  const destinationRegisterNumber = getWriteBackRegisterNumber(instruction, effect);
  const writeBackDest = destinationRegisterNumber === null ? undefined : toHex8(destinationRegisterNumber);

  if (effect?.wbWrite) {
    return {
      writeBackValue: toHex32(effect.wbWrite.value),
      writeBackDest,
    };
  }

  if (!instruction) {
    return { writeBackDest };
  }

  const exSignals = getExSignalValues(instruction, values);
  const memSignals = getMemSignalValues(instruction, values, memoryWords);
  const writeBackValue = instruction.mnemonic === "lw" ? memSignals.memoryReadData : exSignals.aluResult;

  return {
    writeBackValue,
    writeBackDest,
  };
}

function getMemSignalValues(
  instruction: ParsedInstruction | null,
  values: Record<string, string>,
  memoryWords: SparseMemoryWords,
): {
  memoryAddress?: string;
  memoryWriteData?: string;
  memoryReadData?: string;
} {
  if (!instruction) {
    return {};
  }

  const { mnemonic, operands } = instruction;
  const latchedAluResult = getExSignalValues(instruction, values).aluResult;
  const latchedAddressValue = latchedAluResult ? Number.parseInt(latchedAluResult, 16) >>> 0 : null;

  try {
    if (["lw", "sw"].includes(mnemonic) && operands.length === 2) {
      const match = operands[1].trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
      if (!match) {
        return { memoryAddress: latchedAluResult };
      }

      const offset = parseImmediate(match[1]);
      const baseValue = getRegisterNumericValue(values, parseRegister(match[2].trim()));
      if (baseValue === null) {
        return { memoryAddress: latchedAluResult };
      }

      const signExtendedOffset = ((offset & 0xffff) << 16 >> 16) >>> 0;
      const address = (baseValue + signExtendedOffset) >>> 0;
      if (address % 4 !== 0) {
        return { memoryAddress: latchedAluResult };
      }

      if (mnemonic === "sw") {
        const rtValue = getRegisterNumericValue(values, parseRegister(operands[0]));
        return {
          memoryAddress: toHex32(address) ?? latchedAluResult,
          memoryWriteData: rtValue === null ? undefined : toHex32(rtValue),
          memoryReadData: toHex32(readWord(memoryWords, address)),
        };
      }

      return {
        memoryAddress: toHex32(address) ?? latchedAluResult,
        memoryReadData: toHex32(readWord(memoryWords, address)),
      };
    }
  } catch {
    return {
      memoryAddress: latchedAluResult,
      memoryReadData: latchedAddressValue === null ? undefined : toHex32(readWord(memoryWords, latchedAddressValue)),
    };
  }

  return {
    memoryAddress: latchedAluResult,
    memoryReadData: latchedAddressValue === null ? undefined : toHex32(readWord(memoryWords, latchedAddressValue)),
  };
}

export function buildPipelineSignalValues(args: {
  instructions: ParsedInstruction[];
  pipelineInstructionIndices: PipelineInstructionSlots;
  pipelineEffects: PipelineEffectSlots;
  encodedInstructionHexByPc: Record<number, string>;
  registerValues: Record<string, string>;
  memoryWords: SparseMemoryWords;
}): PipelineSignalValues {
  const { instructions, pipelineInstructionIndices, pipelineEffects, encodedInstructionHexByPc, registerValues, memoryWords } = args;
  const ifInstructionIndex = pipelineInstructionIndices.IF;
  const idInstructionIndex = pipelineInstructionIndices.ID;
  const exInstructionIndex = pipelineInstructionIndices.EX;
  const memInstructionIndex = pipelineInstructionIndices.MEM;
  const wbInstructionIndex = pipelineInstructionIndices.WB;
  const ifInstruction = ifInstructionIndex === null ? null : instructions[ifInstructionIndex];
  const idInstruction = idInstructionIndex === null ? null : instructions[idInstructionIndex];
  const exInstruction = exInstructionIndex === null ? null : instructions[exInstructionIndex];
  const memInstruction = memInstructionIndex === null ? null : instructions[memInstructionIndex];
  const wbInstruction = wbInstructionIndex === null ? null : instructions[wbInstructionIndex];
  const [rsNumber, rtNumber] = getIdReadRegisterNumbers(idInstruction);
  const immediateValues = getIdImmediateValues(idInstruction);
  const exSignalValues = getExSignalValues(exInstruction, registerValues);
  const memSignalValues = getMemSignalValues(memInstruction, registerValues, memoryWords);
  const wbSignalValues = getWbSignalValues(wbInstruction, pipelineEffects.WB, registerValues, memoryWords);

  return {
    pc: ifInstruction ? `0x${(ifInstruction.pc >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
    pcPlus4: ifInstruction ? `0x${(((ifInstruction.pc >>> 0) + 4) >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
    constant4: ifInstruction ? "0x00000004" : undefined,
    instructionWord: ifInstruction ? encodedInstructionHexByPc[ifInstruction.pc >>> 0] : undefined,
    rsValue: getRegisterHexValue(registerValues, rsNumber),
    rtValue: getRegisterHexValue(registerValues, rtNumber),
    imm16Value: immediateValues.imm16Value,
    signExtendedImmValue: immediateValues.signExtendedImmValue,
    aluInputA: exSignalValues.aluInputA,
    aluInputB: exSignalValues.aluInputB,
    aluResult: exSignalValues.aluResult,
    memoryAddress: memSignalValues.memoryAddress,
    memoryWriteData: memSignalValues.memoryWriteData,
    memoryReadData: memSignalValues.memoryReadData,
    writeBackValue: wbSignalValues.writeBackValue,
    writeBackDest: wbSignalValues.writeBackDest,
  };
}
