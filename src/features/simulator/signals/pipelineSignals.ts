import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import type { ActiveSignalComponent } from "@/features/components/placement/componentSignalRuntime";
import { applySignalComponentToPathNumber } from "@/features/components/placement/componentSignalRuntime";
import type { PipelineEffectSlots, PipelineInstructionSlots, StageEffect, SparseMemoryWords } from "../core/types";
import { REG_INFO } from "@/monaco/mips/mipsData";
import { parseRegisterValue, toHex32 } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "../core/parse";
import type { HoveredSignalValues } from "@/features/pipelineCanvas/pipelineHoverMap";
import { readWord } from "../runtime/memoryRuntime";
import { resolveControlFlow } from "../stages/controlFlow";
import { shouldStallForLoadUseHazard } from "../stages/hazards";

export type PipelineSignalValues = HoveredSignalValues;

const UNKNOWN_VALUE = "Unknown";
const EXCEPTION_PC_VALUE = "0x80000180";

const REGISTER_ALIAS_BY_NUMBER = Object.entries(REG_INFO).reduce<Record<number, string>>((acc, [alias, info]) => {
  acc[info.num] = alias;
  return acc;
}, {});

function toHex8(value: number): string {
  return `0x${(value & 0xff).toString(16).toUpperCase().padStart(2, "0")}`;
}

function toControlBit(value: boolean): string {
  return value ? "0x01" : "0x00";
}

function toControlCode(value: number): string {
  return toHex8(value);
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

function getExForwardRegisterNumbers(instruction: ParsedInstruction | null): [number | null, number | null] {
  if (!instruction) {
    return [null, null];
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), parseRegister(operands[2])];
    }
    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), null];
    }
    if (["lw", "lb", "lbu", "lh", "lhu"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), null];
    }
    if (["sw", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), parseRegister(operands[0])];
    }
    if (["sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[2]), parseRegister(operands[1])];
    }
    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), null];
    }
    if (mnemonic === "move" && operands.length === 2) {
      return [parseRegister(operands[1]), null];
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

function toHexRegister(registerNumber: number | null): string | undefined {
  return registerNumber === null ? undefined : toHex8(registerNumber);
}

function getInstructionFieldRegisters(instruction: ParsedInstruction | null): {
  rs: number | null;
  rt: number | null;
  rd: number | null;
} {
  if (!instruction) {
    return { rs: null, rt: null, rd: null };
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      return {
        rs: parseRegister(operands[1]),
        rt: parseRegister(operands[2]),
        rd: parseRegister(operands[0]),
      };
    }
    if (["sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
      return {
        rs: parseRegister(operands[2]),
        rt: parseRegister(operands[1]),
        rd: parseRegister(operands[0]),
      };
    }
    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      return {
        rs: 0,
        rt: parseRegister(operands[1]),
        rd: parseRegister(operands[0]),
      };
    }
    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      return {
        rs: parseRegister(operands[1]),
        rt: parseRegister(operands[0]),
        rd: null,
      };
    }
    if (mnemonic === "move" && operands.length === 2) {
      return {
        rs: parseRegister(operands[1]),
        rt: 0,
        rd: parseRegister(operands[0]),
      };
    }
    if (mnemonic === "lui" && operands.length === 2) {
      return {
        rs: 0,
        rt: parseRegister(operands[0]),
        rd: null,
      };
    }
    if (mnemonic === "li" && operands.length === 2) {
      return {
        rs: 0,
        rt: parseRegister(operands[0]),
        rd: null,
      };
    }
    if (["lw", "lb", "lbu", "lh", "lhu", "sw", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      return {
        rs: parseMemoryBaseRegister(operands[1]),
        rt: parseRegister(operands[0]),
        rd: null,
      };
    }
    if ((mnemonic === "beq" || mnemonic === "bne") && operands.length === 3) {
      return {
        rs: parseRegister(operands[0]),
        rt: parseRegister(operands[1]),
        rd: null,
      };
    }
    if (["blez", "bgtz", "bltz", "bgez", "jr"].includes(mnemonic) && operands.length >= 1) {
      return {
        rs: parseRegister(operands[0]),
        rt: 0,
        rd: null,
      };
    }
    if (mnemonic === "jalr") {
      if (operands.length === 1) {
        return {
          rs: parseRegister(operands[0]),
          rt: 0,
          rd: 31,
        };
      }
      if (operands.length === 2) {
        return {
          rs: parseRegister(operands[1]),
          rt: 0,
          rd: parseRegister(operands[0]),
        };
      }
    }
    if (["mult", "multu", "div", "divu"].includes(mnemonic) && operands.length === 2) {
      return {
        rs: parseRegister(operands[0]),
        rt: parseRegister(operands[1]),
        rd: null,
      };
    }
    if (["mthi", "mtlo"].includes(mnemonic) && operands.length === 1) {
      return {
        rs: parseRegister(operands[0]),
        rt: 0,
        rd: null,
      };
    }
  } catch {
    return { rs: null, rt: null, rd: null };
  }

  return { rs: null, rt: null, rd: null };
}

function getSignExtendedImmediateHex(instruction: ParsedInstruction | null): string | undefined {
  return getIdImmediateValues(instruction).signExtendedImmValue;
}

function getShiftedImmediateHex(instruction: ParsedInstruction | null): string | undefined {
  const signExtendedImmediate = getSignExtendedImmediateHex(instruction);
  if (!signExtendedImmediate) {
    return undefined;
  }

  const value = Number.parseInt(signExtendedImmediate, 16);
  return Number.isNaN(value) ? undefined : toHex32((value << 2) >>> 0);
}

function getBranchTargetHex(instruction: ParsedInstruction | null): string | undefined {
  if (!instruction) {
    return undefined;
  }

  const shiftedImmediate = getShiftedImmediateHex(instruction);
  if (!shiftedImmediate) {
    return undefined;
  }

  const offsetValue = Number.parseInt(shiftedImmediate, 16);
  return Number.isNaN(offsetValue) ? undefined : toHex32(((instruction.pc >>> 0) + 4 + offsetValue) >>> 0);
}

type InstructionControlBundle = {
  regWrite: boolean;
  memToReg: boolean;
  memRead: boolean;
  memWrite: boolean;
  regDst: boolean;
  aluSrc: boolean;
};

function getInstructionControlBundle(instruction: ParsedInstruction | null): InstructionControlBundle | null {
  if (!instruction) {
    return null;
  }

  const { mnemonic } = instruction;
  const regWrite = getWriteBackRegisterNumber(instruction, null) !== null;
  const memRead = mnemonic === "lw";
  const memWrite = mnemonic === "sw";
  const memToReg = mnemonic === "lw";
  const regDst = [
    "add",
    "addu",
    "sub",
    "subu",
    "and",
    "or",
    "xor",
    "nor",
    "slt",
    "sltu",
    "sll",
    "srl",
    "sra",
    "sllv",
    "srlv",
    "srav",
    "move",
  ].includes(mnemonic);
  const aluSrc = [
    "addi",
    "addiu",
    "andi",
    "ori",
    "xori",
    "slti",
    "sltiu",
    "lui",
    "li",
    "lw",
    "sw",
    "lb",
    "lbu",
    "lh",
    "lhu",
    "sb",
    "sh",
  ].includes(mnemonic);

  return { regWrite, memToReg, memRead, memWrite, regDst, aluSrc };
}

function formatExControlBundle(bundle: InstructionControlBundle | null): string | undefined {
  return bundle ? `RegDst=${bundle.regDst ? 1 : 0}, ALUSrc=${bundle.aluSrc ? 1 : 0}` : undefined;
}

function formatMControlBundle(bundle: InstructionControlBundle | null): string | undefined {
  return bundle ? `MemRead=${bundle.memRead ? 1 : 0}, MemWrite=${bundle.memWrite ? 1 : 0}` : undefined;
}

function formatWbControlBundle(bundle: InstructionControlBundle | null): string | undefined {
  return bundle ? `RegWrite=${bundle.regWrite ? 1 : 0}, MemToReg=${bundle.memToReg ? 1 : 0}` : undefined;
}

function formatFullControlBundle(bundle: InstructionControlBundle | null): string | undefined {
  if (!bundle) {
    return undefined;
  }
  return `EX{${formatExControlBundle(bundle)}} M{${formatMControlBundle(bundle)}} WB{${formatWbControlBundle(bundle)}}`;
}

function resolveForwardedExOperands(args: {
  exInstruction: ParsedInstruction | null;
  memInstruction: ParsedInstruction | null;
  wbInstruction: ParsedInstruction | null;
  pipelineEffects: PipelineEffectSlots;
  registerValues: Record<string, string>;
  memoryWords: SparseMemoryWords;
}): {
  rawAValue?: string;
  rawBValue?: string;
  forwardedAValue?: string;
  forwardedBValue?: string;
  aluInputBValue?: string;
  aluResult?: string;
  exRtRegister?: string;
  exRdRegister?: string;
  exDestRegister?: string;
  memForwardValue?: string;
  wbForwardValue?: string;
} {
  const { exInstruction, memInstruction, wbInstruction, pipelineEffects, registerValues, memoryWords } = args;
  if (!exInstruction) {
    return {};
  }

  const exFields = getInstructionFieldRegisters(exInstruction);
  const rawAValue = getRegisterHexValue(registerValues, exFields.rs);
  const rawBValue = getRegisterHexValue(registerValues, exFields.rt);
  const memDestRegister = getWriteBackRegisterNumber(memInstruction, pipelineEffects.MEM);
  const wbDestRegister = getWriteBackRegisterNumber(wbInstruction, pipelineEffects.WB);
  const memCanForward = memInstruction !== null && memInstruction.mnemonic !== "lw" && memDestRegister !== null && memDestRegister !== 0;
  const wbCanForward = wbDestRegister !== null && wbDestRegister !== 0;
  const memForwardValue = getExSignalValues(memInstruction, registerValues).aluResult;
  const wbForwardValue = getWbSignalValues(wbInstruction, pipelineEffects.WB, registerValues, memoryWords).writeBackValue;

  const [sourceARegister, sourceBRegister] = getExForwardRegisterNumbers(exInstruction);

  const forwardedAValue =
    sourceARegister === null
      ? rawAValue
      : memCanForward && memDestRegister === sourceARegister
        ? memForwardValue ?? rawAValue
        : wbCanForward && wbDestRegister === sourceARegister
          ? wbForwardValue ?? rawAValue
          : rawAValue;

  const forwardedBValue =
    sourceBRegister === null
      ? rawBValue
      : memCanForward && memDestRegister === sourceBRegister
        ? memForwardValue ?? rawBValue
        : wbCanForward && wbDestRegister === sourceBRegister
          ? wbForwardValue ?? rawBValue
          : rawBValue;

  const signExtendedImmediate = getSignExtendedImmediateHex(exInstruction);
  const bundle = getInstructionControlBundle(exInstruction);
  const aluInputBValue = bundle?.aluSrc ? signExtendedImmediate ?? forwardedBValue : forwardedBValue;

  const actualValues = getExSignalValues(exInstruction, {
    ...registerValues,
  });

  const aNumeric = forwardedAValue ? Number.parseInt(forwardedAValue, 16) >>> 0 : null;
  const forwardedBNumeric = forwardedBValue ? Number.parseInt(forwardedBValue, 16) >>> 0 : null;
  const finalBNumeric = aluInputBValue ? Number.parseInt(aluInputBValue, 16) >>> 0 : null;
  let aluResult = actualValues.aluResult;

  try {
    const { mnemonic, operands } = exInstruction;
    if (aNumeric !== null && finalBNumeric !== null) {
      if (["add", "addu", "addi", "addiu", "lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic)) {
        aluResult = toHex32((aNumeric + finalBNumeric) >>> 0);
      } else if (["sub", "subu"].includes(mnemonic)) {
        aluResult = toHex32((aNumeric - finalBNumeric) >>> 0);
      } else if (mnemonic === "and" || mnemonic === "andi") {
        aluResult = toHex32(aNumeric & finalBNumeric);
      } else if (mnemonic === "or" || mnemonic === "ori") {
        aluResult = toHex32(aNumeric | finalBNumeric);
      } else if (mnemonic === "xor" || mnemonic === "xori") {
        aluResult = toHex32(aNumeric ^ finalBNumeric);
      } else if (mnemonic === "nor") {
        aluResult = toHex32((~(aNumeric | finalBNumeric)) >>> 0);
      } else if (mnemonic === "slt") {
        aluResult = toHex32((aNumeric >> 0) < (finalBNumeric >> 0) ? 1 : 0);
      } else if (mnemonic === "sltu" || mnemonic === "sltiu") {
        aluResult = toHex32(aNumeric < finalBNumeric ? 1 : 0);
      } else if (mnemonic === "slti") {
        aluResult = toHex32((aNumeric >> 0) < (finalBNumeric >> 0) ? 1 : 0);
      } else if (mnemonic === "sll" && operands.length === 3 && forwardedBNumeric !== null) {
        const shamt = parseImmediate(operands[2]) & 0x1f;
        aluResult = toHex32((forwardedBNumeric << shamt) >>> 0);
      } else if (mnemonic === "srl" && operands.length === 3 && forwardedBNumeric !== null) {
        const shamt = parseImmediate(operands[2]) & 0x1f;
        aluResult = toHex32(forwardedBNumeric >>> shamt);
      } else if (mnemonic === "sra" && operands.length === 3 && forwardedBNumeric !== null) {
        const shamt = parseImmediate(operands[2]) & 0x1f;
        aluResult = toHex32((forwardedBNumeric >> shamt) >>> 0);
      }
    }
  } catch {
    // Fall back to the non-forwarded ALU estimate when recomputation fails.
  }

  return {
    rawAValue,
    rawBValue,
    forwardedAValue,
    forwardedBValue,
    aluInputBValue,
    aluResult,
    exRtRegister: toHexRegister(exFields.rt),
    exRdRegister: toHexRegister(exFields.rd),
    exDestRegister: toHexRegister(getWriteBackRegisterNumber(exInstruction, null)),
    memForwardValue,
    wbForwardValue,
  };
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

function getForwardingDataSignals(args: {
  exInstruction: ParsedInstruction | null;
  memInstruction: ParsedInstruction | null;
  wbInstruction: ParsedInstruction | null;
  pipelineEffects: PipelineEffectSlots;
  registerValues: Record<string, string>;
}): {
  exSourceAReg?: string;
  exSourceBReg?: string;
  memForwardDest?: string;
  wbForwardDest?: string;
  memForwardValue?: string;
} {
  const { exInstruction, memInstruction, wbInstruction, pipelineEffects, registerValues } = args;
  const [exSourceARegister, exSourceBRegister] = getExForwardRegisterNumbers(exInstruction);
  const memDestRegister = getWriteBackRegisterNumber(memInstruction, pipelineEffects.MEM);
  const wbDestRegister = getWriteBackRegisterNumber(wbInstruction, pipelineEffects.WB);
  const memForwardValue = getExSignalValues(memInstruction, registerValues).aluResult;

  return {
    exSourceAReg: exSourceARegister === null ? undefined : toHex8(exSourceARegister),
    exSourceBReg: exSourceBRegister === null ? undefined : toHex8(exSourceBRegister),
    memForwardDest: memDestRegister === null ? undefined : toHex8(memDestRegister),
    wbForwardDest: wbDestRegister === null ? undefined : toHex8(wbDestRegister),
    memForwardValue,
  };
}

function getControlSignalValues(args: {
  idInstruction: ParsedInstruction | null;
  exInstruction: ParsedInstruction | null;
  memInstruction: ParsedInstruction | null;
  wbInstruction: ParsedInstruction | null;
  pipelineEffects: PipelineEffectSlots;
  registerValues: Record<string, string>;
  labels: Record<string, number>;
  pcToInstructionIndex: Map<number, number>;
  activeSignalComponent: ActiveSignalComponent;
}): {
  pcSrcCtrl?: string;
  regDstCtrl?: string;
  aluSrcCtrl?: string;
  memReadCtrl?: string;
  memWriteCtrl?: string;
  memToRegCtrl?: string;
  fwdACtrl?: string;
  fwdBCtrl?: string;
} {
  const {
    idInstruction,
    exInstruction,
    memInstruction,
    wbInstruction,
    pipelineEffects,
    registerValues,
    labels,
    pcToInstructionIndex,
    activeSignalComponent,
  } = args;

  const idMnemonic = idInstruction?.mnemonic;
  const memMnemonic = memInstruction?.mnemonic;

  const regDst =
    Boolean(idMnemonic) &&
    ["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu", "sll", "srl", "sra", "sllv", "srlv", "srav", "move"].includes(
      idMnemonic!,
    );
  const aluSrc =
    Boolean(idMnemonic) &&
    ["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu", "lui", "li", "lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(
      idMnemonic!,
    );
  const memRead = Boolean(memMnemonic) && ["lw"].includes(memMnemonic!);
  const memWrite = Boolean(memMnemonic) && ["sw"].includes(memMnemonic!);
  const memToReg = Boolean(memMnemonic) && ["lw"].includes(memMnemonic!);
  const pcSrc =
    exInstruction !== null
      ? resolveControlFlow(exInstruction, registerValues, labels, pcToInstructionIndex, activeSignalComponent).taken
      : false;
  const [fwdARegister, fwdBRegister] = getExForwardRegisterNumbers(exInstruction);
  const memDestRegister = getWriteBackRegisterNumber(memInstruction, pipelineEffects.MEM);
  const wbDestRegister = getWriteBackRegisterNumber(wbInstruction, pipelineEffects.WB);
  const memCanForward = memInstruction !== null && memInstruction.mnemonic !== "lw" && memDestRegister !== null && memDestRegister !== 0;
  const wbCanForward = wbDestRegister !== null && wbDestRegister !== 0;
  const fwdA =
    fwdARegister === null
      ? 0
      : memCanForward && memDestRegister === fwdARegister
        ? 0x02
        : wbCanForward && wbDestRegister === fwdARegister
          ? 0x01
          : 0x00;
  const fwdB =
    fwdBRegister === null
      ? 0
      : memCanForward && memDestRegister === fwdBRegister
        ? 0x02
        : wbCanForward && wbDestRegister === fwdBRegister
          ? 0x01
          : 0x00;

  return {
    pcSrcCtrl: toControlBit(pcSrc),
    regDstCtrl: idInstruction ? toControlBit(regDst) : undefined,
    aluSrcCtrl: idInstruction ? toControlBit(aluSrc) : undefined,
    memReadCtrl: memInstruction ? toControlBit(memRead) : undefined,
    memWriteCtrl: memInstruction ? toControlBit(memWrite) : undefined,
    memToRegCtrl: memInstruction ? toControlBit(memToReg) : undefined,
    fwdACtrl: exInstruction ? toControlCode(fwdA) : undefined,
    fwdBCtrl: exInstruction ? toControlCode(fwdB) : undefined,
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
  labels: Record<string, number>;
  pcToInstructionIndex: Map<number, number>;
  activeSignalComponent: ActiveSignalComponent;
}): PipelineSignalValues {
  const {
    instructions,
    pipelineInstructionIndices,
    pipelineEffects,
    encodedInstructionHexByPc,
    registerValues,
    memoryWords,
    labels,
    pcToInstructionIndex,
    activeSignalComponent,
  } = args;
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
  const idFields = getInstructionFieldRegisters(idInstruction);
  const immediateValues = getIdImmediateValues(idInstruction);
  const exResolvedValues = resolveForwardedExOperands({
    exInstruction,
    memInstruction,
    wbInstruction,
    pipelineEffects,
    registerValues,
    memoryWords,
  });
  const memSignalValues = getMemSignalValues(memInstruction, registerValues, memoryWords);
  const wbSignalValues = getWbSignalValues(wbInstruction, pipelineEffects.WB, registerValues, memoryWords);
  const forwardingDataSignals = getForwardingDataSignals({
    exInstruction,
    memInstruction,
    wbInstruction,
    pipelineEffects,
    registerValues,
  });
  const controlSignalValues = getControlSignalValues({
    idInstruction,
    exInstruction,
    memInstruction,
    wbInstruction,
    pipelineEffects,
    registerValues,
    labels,
    pcToInstructionIndex,
    activeSignalComponent,
  });
  const idBundle = getInstructionControlBundle(idInstruction);
  const exBundle = getInstructionControlBundle(exInstruction);
  const memBundle = getInstructionControlBundle(memInstruction);
  const wbBundle = getInstructionControlBundle(wbInstruction);
  const hasLoadUseHazard = shouldStallForLoadUseHazard(exInstruction, idInstruction);
  const controlFlow = resolveControlFlow(
    exInstruction,
    registerValues,
    labels,
    pcToInstructionIndex,
    activeSignalComponent,
  );
  const branchTaken = !hasLoadUseHazard && controlFlow.taken && controlFlow.targetInstructionIndex !== null;
  const branchTargetInstruction =
    controlFlow.targetInstructionIndex === null ? null : instructions[controlFlow.targetInstructionIndex] ?? null;
  const sequentialNextPc = ifInstruction ? toHex32(((ifInstruction.pc >>> 0) + 4) >>> 0) : undefined;
  const selectedNextPc = hasLoadUseHazard
    ? (ifInstruction ? toHex32(ifInstruction.pc >>> 0) : undefined)
    : branchTaken
      ? (branchTargetInstruction ? toHex32(branchTargetInstruction.pc >>> 0) : undefined)
      : sequentialNextPc;
  const selectedNextPcNumeric =
    selectedNextPc === undefined ? null : (Number.parseInt(selectedNextPc, 16) >>> 0);
  const transformedSelectedNextPc =
    selectedNextPcNumeric === null
      ? undefined
      : toHex32(
          applySignalComponentToPathNumber(
            activeSignalComponent,
            "nextPcSelected",
            selectedNextPcNumeric,
          ) ?? selectedNextPcNumeric,
        );

  return {
    pc: ifInstruction ? `0x${(ifInstruction.pc >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
    pcPlus4: ifInstruction ? `0x${(((ifInstruction.pc >>> 0) + 4) >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
    constant4: ifInstruction ? "0x00000004" : undefined,
    nextPcSequential: sequentialNextPc,
    nextPcSelected: transformedSelectedNextPc,
    exceptionVector: EXCEPTION_PC_VALUE,
    instructionWord: ifInstruction ? encodedInstructionHexByPc[ifInstruction.pc >>> 0] : undefined,
    idInstructionWord: idInstruction ? encodedInstructionHexByPc[idInstruction.pc >>> 0] : undefined,
    idRsRegister: toHexRegister(idFields.rs),
    idRtRegister: toHexRegister(idFields.rt),
    idRdRegister: toHexRegister(idFields.rd),
    rsValue: getRegisterHexValue(registerValues, rsNumber),
    rtValue: getRegisterHexValue(registerValues, rtNumber),
    imm16Value: immediateValues.imm16Value,
    signExtendedImmValue: immediateValues.signExtendedImmValue,
    idBranchBasePcPlus4: idInstruction ? toHex32(((idInstruction.pc >>> 0) + 4) >>> 0) : undefined,
    idBranchOffsetShifted: getShiftedImmediateHex(idInstruction),
    idBranchTarget: getBranchTargetHex(idInstruction),
    exRawAValue: exResolvedValues.rawAValue,
    exRawBValue: exResolvedValues.rawBValue,
    exSignExtendedImmValue: getSignExtendedImmediateHex(exInstruction),
    aluInputA: exResolvedValues.forwardedAValue,
    aluInputB: exResolvedValues.aluInputBValue,
    aluResult: exResolvedValues.aluResult,
    exRtRegister: exResolvedValues.exRtRegister,
    exRdRegister: exResolvedValues.exRdRegister,
    exDestRegister: exResolvedValues.exDestRegister,
    exForwardBValue: exResolvedValues.forwardedBValue,
    epcValue: exInstruction ? UNKNOWN_VALUE : undefined,
    memoryAddress: memSignalValues.memoryAddress,
    memoryWriteData: memSignalValues.memoryWriteData,
    memoryReadData: memSignalValues.memoryReadData,
    writeBackValue: wbSignalValues.writeBackValue,
    writeBackDest: wbSignalValues.writeBackDest,
    pcWriteCtrl: (ifInstruction || idInstruction || exInstruction) ? toControlBit(!hasLoadUseHazard) : undefined,
    ifIdWriteCtrl: (ifInstruction || idInstruction || exInstruction) ? toControlBit(!hasLoadUseHazard) : undefined,
    pcSrcCtrl: controlSignalValues.pcSrcCtrl,
    regDstCtrl: controlSignalValues.regDstCtrl,
    aluSrcCtrl: controlSignalValues.aluSrcCtrl,
    memReadCtrl: controlSignalValues.memReadCtrl,
    memWriteCtrl: controlSignalValues.memWriteCtrl,
    memToRegCtrl: controlSignalValues.memToRegCtrl,
    fwdACtrl: controlSignalValues.fwdACtrl,
    fwdBCtrl: controlSignalValues.fwdBCtrl,
    ifFlushCtrl: exInstruction ? toControlBit(branchTaken) : undefined,
    exFlushCtrl: exInstruction ? toControlBit(false) : undefined,
    idFlushCtrl: (idInstruction || exInstruction) ? toControlBit(branchTaken || hasLoadUseHazard) : undefined,
    hazardFlushCtrl: (idInstruction || exInstruction) ? toControlBit(hasLoadUseHazard) : undefined,
    controlFlushCtrl: (idInstruction || exInstruction) ? toControlBit(branchTaken || hasLoadUseHazard) : undefined,
    wbFlushCtrl: exInstruction ? toControlBit(false) : undefined,
    mFlushCtrl: exInstruction ? toControlBit(false) : undefined,
    idControlBundle: formatFullControlBundle(idBundle),
    zeroControlBundle: idInstruction ? "EX{RegDst=0, ALUSrc=0} M{MemRead=0, MemWrite=0} WB{RegWrite=0, MemToReg=0}" : undefined,
    flushedMControlBundle: idInstruction ? (branchTaken || hasLoadUseHazard ? "MemRead=0, MemWrite=0" : formatMControlBundle(idBundle)) : undefined,
    flushedWbControlBundle: idInstruction ? (branchTaken || hasLoadUseHazard ? "RegWrite=0, MemToReg=0" : formatWbControlBundle(idBundle)) : undefined,
    flushedExControlBundle: idInstruction ? (branchTaken || hasLoadUseHazard ? "RegDst=0, ALUSrc=0" : formatExControlBundle(idBundle)) : undefined,
    zeroMControlBundle: exInstruction ? "MemRead=0, MemWrite=0" : undefined,
    zeroWbControlBundle: exInstruction ? "RegWrite=0, MemToReg=0" : undefined,
    exmemWbControlBundle: (exInstruction || memInstruction) ? formatWbControlBundle(memBundle ?? exBundle) : undefined,
    memwbWbControlBundle: wbInstruction ? formatWbControlBundle(wbBundle) : undefined,
    exmemMControlBundle: exInstruction ? formatMControlBundle(exBundle) : undefined,
    wbRegWriteCtrl: wbInstruction ? toControlBit(Boolean(wbBundle?.regWrite)) : undefined,
    exSourceAReg: forwardingDataSignals.exSourceAReg,
    exSourceBReg: forwardingDataSignals.exSourceBReg,
    memForwardDest: forwardingDataSignals.memForwardDest,
    wbForwardDest: forwardingDataSignals.wbForwardDest,
    memForwardValue: exResolvedValues.memForwardValue ?? forwardingDataSignals.memForwardValue,
  };
}
