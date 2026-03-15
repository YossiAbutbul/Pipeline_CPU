import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import {
  applySignalComponentToNumber,
  applySignalComponentToPathNumber,
  type ActiveSignalComponent,
} from "@/features/components/placement/componentSignalRuntime";
import { REGISTERS, parseRegisterValue, toHex32 } from "@/features/statePanels/registerEditorModel";
import { parseImmediate } from "../core/parse";
import type { StageEffect } from "../core/types";
import { createRuntimeStageError } from "./runtimeError";

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
  activeSignalComponent: ActiveSignalComponent = null,
): Record<string, string> {
  if (effect?.wbWrite) {
    return writeRegisterValue(
      values,
      effect.wbWrite.registerNumber,
      applySignalComponentToNumber(activeSignalComponent, "writeBackValue", effect.wbWrite.value) ??
        effect.wbWrite.value,
    );
  }

  if (!instruction) {
    return values;
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rs =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "exA",
          getRegisterValue(values, parseRegister(operands[1])),
        ) ?? 0;
      const rt =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "aluB",
          applySignalComponentToPathNumber(
            activeSignalComponent,
            "exB",
            getRegisterValue(values, parseRegister(operands[2])),
          ),
        ) ?? 0;

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

      return writeRegisterValue(
        values,
        rd,
        applySignalComponentToNumber(
          activeSignalComponent,
          activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "writeBackValue",
          result,
        ) ?? result,
      );
    }

    if (["sll", "srl", "sra"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rt =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "aluB",
          applySignalComponentToPathNumber(
            activeSignalComponent,
            "exB",
            getRegisterValue(values, parseRegister(operands[1])),
          ),
        ) ?? 0;
      const shamt = parseImmediate(operands[2]) & 0x1f;
      const result = mnemonic === "sll" ? (rt << shamt) >>> 0 : mnemonic === "srl" ? rt >>> shamt : (rt >> shamt) >>> 0;
      return writeRegisterValue(
        values,
        rd,
        applySignalComponentToNumber(
          activeSignalComponent,
          activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "writeBackValue",
          result,
        ) ?? result,
      );
    }

    if (["sllv", "srlv", "srav"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rd = parseRegister(operands[0]);
      const rt =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "aluB",
          applySignalComponentToPathNumber(
            activeSignalComponent,
            "exB",
            getRegisterValue(values, parseRegister(operands[1])),
          ),
        ) ?? 0;
      const rs =
        (applySignalComponentToPathNumber(
          activeSignalComponent,
          "exA",
          getRegisterValue(values, parseRegister(operands[2])),
        ) ?? 0) & 0x1f;
      const result = mnemonic === "sllv" ? (rt << rs) >>> 0 : mnemonic === "srlv" ? rt >>> rs : (rt >> rs) >>> 0;
      return writeRegisterValue(
        values,
        rd,
        applySignalComponentToNumber(
          activeSignalComponent,
          activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "writeBackValue",
          result,
        ) ?? result,
      );
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic)) {
      if (operands.length !== 3) return values;
      const rt = parseRegister(operands[0]);
      const rs =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "exA",
          getRegisterValue(values, parseRegister(operands[1])),
        ) ?? 0;
      const imm =
        applySignalComponentToPathNumber(activeSignalComponent, "imm", parseImmediate(operands[2]) >>> 0) ?? 0;
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
      return writeRegisterValue(
        values,
        rt,
        applySignalComponentToNumber(
          activeSignalComponent,
          activeSignalComponent?.signalKey === "aluResult" ? "aluResult" : "writeBackValue",
          result,
        ) ?? result,
      );
    }

    if (mnemonic === "lui") {
      if (operands.length !== 2) return values;
      const rt = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]) & 0xffff;
      const result = (imm << 16) >>> 0;
      return writeRegisterValue(
        values,
        rt,
        applySignalComponentToNumber(activeSignalComponent, "writeBackValue", result) ?? result,
      );
    }

    if (mnemonic === "li") {
      if (operands.length !== 2) return values;
      const rt = parseRegister(operands[0]);
      const imm = parseImmediate(operands[1]);
      return writeRegisterValue(
        values,
        rt,
        applySignalComponentToNumber(activeSignalComponent, "writeBackValue", imm >>> 0) ?? (imm >>> 0),
      );
    }

    if (mnemonic === "move") {
      if (operands.length !== 2) return values;
      const rd = parseRegister(operands[0]);
      const rs =
        applySignalComponentToPathNumber(
          activeSignalComponent,
          "exA",
          getRegisterValue(values, parseRegister(operands[1])),
        ) ?? 0;
      return writeRegisterValue(
        values,
        rd,
        applySignalComponentToNumber(activeSignalComponent, "writeBackValue", rs) ?? rs,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createRuntimeStageError("WB", instruction, message);
  }

  return values;
}
