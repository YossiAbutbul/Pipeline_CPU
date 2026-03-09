import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";
import { parseRegisterValue } from "@/features/statePanels/registerEditorModel";

type ControlFlowResult = {
  taken: boolean;
  targetInstructionIndex: number | null;
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

function getLabelTargetInstructionIndex(
  label: string,
  labels: Record<string, number>,
  pcToInstructionIndex: Map<number, number>,
): number | null {
  const targetPc = labels[label];
  if (typeof targetPc !== "number") {
    return null;
  }
  const targetInstructionIndex = pcToInstructionIndex.get(targetPc);
  return typeof targetInstructionIndex === "number" ? targetInstructionIndex : null;
}

function toSigned32(value: number): number {
  return value >> 0;
}

export function resolveControlFlow(
  instruction: ParsedInstruction | null,
  registerValues: Record<string, string>,
  labels: Record<string, number>,
  pcToInstructionIndex: Map<number, number>,
): ControlFlowResult {
  if (!instruction) {
    return { taken: false, targetInstructionIndex: null };
  }

  const { mnemonic, operands } = instruction;

  try {
    if (mnemonic === "j" && operands.length === 1) {
      return {
        taken: true,
        targetInstructionIndex: getLabelTargetInstructionIndex(operands[0], labels, pcToInstructionIndex),
      };
    }

    if (mnemonic === "beq" && operands.length === 3) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      const rt = getRegisterValue(registerValues, parseRegister(operands[1]));
      if (rs === rt) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[2], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }

    if (mnemonic === "bne" && operands.length === 3) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      const rt = getRegisterValue(registerValues, parseRegister(operands[1]));
      if (rs !== rt) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[2], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }

    if (mnemonic === "blez" && operands.length === 2) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      if (toSigned32(rs) <= 0) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[1], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }

    if (mnemonic === "bgtz" && operands.length === 2) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      if (toSigned32(rs) > 0) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[1], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }

    if (mnemonic === "bltz" && operands.length === 2) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      if (toSigned32(rs) < 0) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[1], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }

    if (mnemonic === "bgez" && operands.length === 2) {
      const rs = getRegisterValue(registerValues, parseRegister(operands[0]));
      if (toSigned32(rs) >= 0) {
        return {
          taken: true,
          targetInstructionIndex: getLabelTargetInstructionIndex(operands[1], labels, pcToInstructionIndex),
        };
      }
      return { taken: false, targetInstructionIndex: null };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[Pipeline] Control-flow evaluation skipped for "${instruction.source}": ${message}`);
  }

  return { taken: false, targetInstructionIndex: null };
}
