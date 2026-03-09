import { parseRegister } from "@/features/compiler/registers";
import type { ParsedInstruction } from "@/features/compiler/types";

function parseMemoryBaseRegister(operand: string): number | null {
  const match = operand.trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return parseRegister(match[2].trim());
}

function getReadRegisters(instruction: ParsedInstruction): number[] {
  const { mnemonic, operands } = instruction;

  if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
    return [parseRegister(operands[1]), parseRegister(operands[2])];
  }

  if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
    return [parseRegister(operands[1])];
  }

  if (["sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
    return [parseRegister(operands[1]), parseRegister(operands[2])];
  }

  if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
    return [parseRegister(operands[1])];
  }

  if (mnemonic === "move" && operands.length === 2) {
    return [parseRegister(operands[1])];
  }

  if (mnemonic === "lw" && operands.length === 2) {
    const base = parseMemoryBaseRegister(operands[1]);
    return base === null ? [] : [base];
  }

  if (mnemonic === "sw" && operands.length === 2) {
    const base = parseMemoryBaseRegister(operands[1]);
    const rt = parseRegister(operands[0]);
    return base === null ? [rt] : [rt, base];
  }

  if ((mnemonic === "beq" || mnemonic === "bne") && operands.length === 3) {
    return [parseRegister(operands[0]), parseRegister(operands[1])];
  }

  if (["blez", "bgtz", "bltz", "bgez"].includes(mnemonic) && operands.length >= 1) {
    return [parseRegister(operands[0])];
  }

  if (mnemonic === "jr" && operands.length === 1) {
    return [parseRegister(operands[0])];
  }

  if (mnemonic === "jalr") {
    if (operands.length === 1) {
      return [parseRegister(operands[0])];
    }
    if (operands.length === 2) {
      return [parseRegister(operands[1])];
    }
  }

  return [];
}

export function shouldStallForLoadUseHazard(
  exInstruction: ParsedInstruction | null,
  idInstruction: ParsedInstruction | null,
): boolean {
  if (!exInstruction || !idInstruction || exInstruction.mnemonic !== "lw" || exInstruction.operands.length !== 2) {
    return false;
  }

  try {
    const loadTarget = parseRegister(exInstruction.operands[0]);
    if (loadTarget === 0) {
      return false;
    }

    const reads = getReadRegisters(idInstruction);
    return reads.includes(loadTarget);
  } catch {
    return false;
  }
}
