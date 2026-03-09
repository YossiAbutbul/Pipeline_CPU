import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import { REGISTERS, parseRegisterValue, toHex32 } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "../core/parse";
import type { StageEffect } from "../core/types";

const REGISTER_ALIAS_BY_NUMBER = REGISTERS.reduce<Record<number, string>>((acc, reg) => {
  acc[reg.num] = reg.alias;
  return acc;
}, {});

function toSigned32(value: number): number {
  return value >> 0;
}

function getRegisterValue(values: Record<string, string>, registerNumber: number): number {
  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return 0;
  }
  return parseRegisterValue(values[alias] ?? "0");
}

function writeRegisterValue(values: Record<string, string>, registerNumber: number, value: number): Record<string, string> {
  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias || alias === "zero") {
    return values;
  }

  return {
    ...values,
    [alias]: toHex32(value),
    zero: "0x00000000",
  };
}

export function applyWriteBack(
  instruction: ParsedInstruction | null,
  values: Record<string, string>,
  effect: StageEffect | null = null,
): Record<string, string> {
  if (effect?.wbWrite) {
    return writeRegisterValue(values, effect.wbWrite.registerNumber, effect.wbWrite.value);
  }

  if (!instruction) {
    return values;
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rs = getRegisterValue(values, parseRegister(operands[1]));
      const rt = getRegisterValue(values, parseRegister(operands[2]));

      const result =
        mnemonic === "add" || mnemonic === "addu"
          ? (rs + rt) >>> 0
          : mnemonic === "sub" || mnemonic === "subu"
            ? (rs - rt) >>> 0
            : mnemonic === "and"
              ? rs & rt
              : mnemonic === "or"
                ? rs | rt
                : mnemonic === "xor"
                  ? rs ^ rt
                  : mnemonic === "nor"
                    ? ~(rs | rt)
                    : mnemonic === "slt"
                      ? toSigned32(rs) < toSigned32(rt)
                        ? 1
                        : 0
                      : rs < rt
                        ? 1
                        : 0;

      return writeRegisterValue(values, rd, result);
    }

    if (["sll", "srl", "sra"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rt = getRegisterValue(values, parseRegister(operands[1]));
      const shamt = parseImmediate(operands[2]) & 0x1f;
      const result = mnemonic === "sll" ? (rt << shamt) >>> 0 : mnemonic === "srl" ? rt >>> shamt : (rt >> shamt) >>> 0;
      return writeRegisterValue(values, rd, result);
    }

    if (["sllv", "srlv", "srav"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rt = getRegisterValue(values, parseRegister(operands[1]));
      const rs = getRegisterValue(values, parseRegister(operands[2])) & 0x1f;
      const result = mnemonic === "sllv" ? (rt << rs) >>> 0 : mnemonic === "srlv" ? rt >>> rs : (rt >> rs) >>> 0;
      return writeRegisterValue(values, rd, result);
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rt = parseRegister(operands[0]);
      const rs = getRegisterValue(values, parseRegister(operands[1]));
      const imm = parseImmediate(operands[2]);
      const result =
        mnemonic === "addi" || mnemonic === "addiu"
          ? (rs + imm) >>> 0
          : mnemonic === "andi"
            ? rs & (imm & 0xffff)
            : mnemonic === "ori"
              ? rs | (imm & 0xffff)
              : mnemonic === "xori"
                ? rs ^ (imm & 0xffff)
                : mnemonic === "slti"
                  ? toSigned32(rs) < toSigned32(imm)
                    ? 1
                    : 0
                  : rs < (imm >>> 0)
                    ? 1
                    : 0;
      return writeRegisterValue(values, rt, result);
    }

    if (mnemonic === "lui") {
      if (operands.length !== 2) return values;
      const rt = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]) & 0xffff;
      return writeRegisterValue(values, rt, (imm << 16) >>> 0);
    }

    if (mnemonic === "li") {
      if (operands.length !== 2) return values;
      const rt = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]);
      return writeRegisterValue(values, rt, imm >>> 0);
    }

    if (mnemonic === "move") {
      if (operands.length !== 2) return values;
      const rd = parseRegister(operands[0]);
      const rs = getRegisterValue(values, parseRegister(operands[1]));
      return writeRegisterValue(values, rd, rs);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Pipeline] WB execution skipped for "${instruction.source}": ${message}`);
  }

  return values;
}
