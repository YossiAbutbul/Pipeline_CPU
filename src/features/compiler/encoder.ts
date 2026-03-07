import { parseRegister } from "./registers";
import type { EncodedInstruction, ParsedInstruction } from "./types";

type LabelMap = Record<string, number>;

const R_FUNCT: Record<string, number> = {
  add: 0x20,
  addu: 0x21,
  sub: 0x22,
  subu: 0x23,
  and: 0x24,
  or: 0x25,
  xor: 0x26,
  nor: 0x27,
  slt: 0x2a,
  sltu: 0x2b,
  sll: 0x00,
  srl: 0x02,
  sra: 0x03,
  sllv: 0x04,
  srlv: 0x06,
  srav: 0x07,
  jr: 0x08,
  jalr: 0x09,
  mult: 0x18,
  multu: 0x19,
  div: 0x1a,
  divu: 0x1b,
  mfhi: 0x10,
  mflo: 0x12,
  mthi: 0x11,
  mtlo: 0x13,
  syscall: 0x0c,
  break: 0x0d,
};

const I_OPCODE: Record<string, number> = {
  addi: 0x08,
  addiu: 0x09,
  andi: 0x0c,
  ori: 0x0d,
  xori: 0x0e,
  slti: 0x0a,
  sltiu: 0x0b,
  lui: 0x0f,
  lw: 0x23,
  sw: 0x2b,
  lb: 0x20,
  lbu: 0x24,
  lh: 0x21,
  lhu: 0x25,
  sb: 0x28,
  sh: 0x29,
  beq: 0x04,
  bne: 0x05,
  blez: 0x06,
  bgtz: 0x07,
};

const J_OPCODE: Record<string, number> = {
  j: 0x02,
  jal: 0x03,
};

function parseImmediate(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`Invalid immediate "${raw}"`);
  }
  return value;
}

function toU16(value: number): number {
  return value & 0xffff;
}

function toU26(value: number): number {
  return value & 0x03ff_ffff;
}

function encodeR(rs: number, rt: number, rd: number, shamt: number, funct: number) {
  const opcode = 0;
  const word =
    ((opcode & 0x3f) << 26) |
    ((rs & 0x1f) << 21) |
    ((rt & 0x1f) << 16) |
    ((rd & 0x1f) << 11) |
    ((shamt & 0x1f) << 6) |
    (funct & 0x3f);

  return {
    word: word >>> 0,
    kind: "R" as const,
    fields: { opcode, rs, rt, rd, shamt, funct },
  };
}

function encodeI(opcode: number, rs: number, rt: number, immediate: number) {
  const imm = toU16(immediate);
  const word =
    ((opcode & 0x3f) << 26) | ((rs & 0x1f) << 21) | ((rt & 0x1f) << 16) | (imm & 0xffff);
  return {
    word: word >>> 0,
    kind: "I" as const,
    fields: { opcode, rs, rt, immediate: imm },
  };
}

function encodeJ(opcode: number, target: number) {
  const address = toU26(target);
  const word = ((opcode & 0x3f) << 26) | address;
  return {
    word: word >>> 0,
    kind: "J" as const,
    fields: { opcode, target: address },
  };
}

function parseMemoryOperand(token: string): { offset: number; base: number } {
  const match = token.trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
  if (!match) {
    throw new Error(`Invalid memory operand "${token}"`);
  }
  const offset = parseImmediate(match[1]);
  const base = parseRegister(match[2].trim());
  return { offset, base };
}

function formatWord(word: number): { binary: string; hex: string } {
  return {
    binary: (word >>> 0).toString(2).padStart(32, "0"),
    hex: `0x${(word >>> 0).toString(16).toUpperCase().padStart(8, "0")}`,
  };
}

function buildEncoded(
  instruction: ParsedInstruction,
  encoded: { kind: "R" | "I" | "J" | "RAW"; word: number; fields: Record<string, number> },
): EncodedInstruction {
  const { binary, hex } = formatWord(encoded.word);
  return {
    source: instruction.source,
    lineNumber: instruction.lineNumber,
    pc: instruction.pc,
    kind: encoded.kind,
    binary,
    hex,
    word: encoded.word >>> 0,
    fields: encoded.fields,
  };
}

function encodeBranchOffset(targetPc: number, currentPc: number): number {
  const relativeWords = (targetPc - (currentPc + 4)) / 4;
  if (!Number.isInteger(relativeWords) || relativeWords < -32768 || relativeWords > 32767) {
    throw new Error(`Branch target is out of range (pc=${currentPc}, target=${targetPc})`);
  }
  return relativeWords;
}

function expectOperandCount(instruction: ParsedInstruction, expected: number) {
  if (instruction.operands.length !== expected) {
    throw new Error(
      `Line ${instruction.lineNumber}: "${instruction.mnemonic}" expects ${expected} operands, got ${instruction.operands.length}`,
    );
  }
}

function getLabelPc(raw: string, labels: LabelMap): number {
  const label = raw.trim();
  const target = labels[label];
  if (typeof target !== "number") {
    throw new Error(`Unknown label "${label}"`);
  }
  return target;
}

export function encodeInstruction(instruction: ParsedInstruction, labels: LabelMap): EncodedInstruction {
  const { mnemonic, operands } = instruction;

  if (mnemonic === "nop" || mnemonic === "bubble") {
    return buildEncoded(instruction, { kind: "RAW", word: 0, fields: { raw: 0 } });
  }

  if (mnemonic === "move") {
    expectOperandCount(instruction, 2);
    const rd = parseRegister(operands[0]);
    const rs = parseRegister(operands[1]);
    const encoded = encodeR(rs, 0, rd, 0, R_FUNCT.addu);
    return buildEncoded(instruction, encoded);
  }

  if (mnemonic === "li") {
    expectOperandCount(instruction, 2);
    const rt = parseRegister(operands[0]);
    const imm = parseImmediate(operands[1]);
    const encoded = encodeI(I_OPCODE.addiu, 0, rt, imm);
    return buildEncoded(instruction, encoded);
  }

  if (mnemonic in J_OPCODE) {
    expectOperandCount(instruction, 1);
    const opcode = J_OPCODE[mnemonic];
    const targetPc = getLabelPc(operands[0], labels);
    const target = targetPc >>> 2;
    return buildEncoded(instruction, encodeJ(opcode, target));
  }

  if (mnemonic in I_OPCODE) {
    const opcode = I_OPCODE[mnemonic];

    if (mnemonic === "lui") {
      expectOperandCount(instruction, 2);
      const rt = parseRegister(operands[0]);
      const immediate = parseImmediate(operands[1]);
      return buildEncoded(instruction, encodeI(opcode, 0, rt, immediate));
    }

    if (["lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic)) {
      expectOperandCount(instruction, 2);
      const rt = parseRegister(operands[0]);
      const { offset, base } = parseMemoryOperand(operands[1]);
      return buildEncoded(instruction, encodeI(opcode, base, rt, offset));
    }

    if (mnemonic === "beq" || mnemonic === "bne") {
      expectOperandCount(instruction, 3);
      const rs = parseRegister(operands[0]);
      const rt = parseRegister(operands[1]);
      const targetPc = getLabelPc(operands[2], labels);
      const immediate = encodeBranchOffset(targetPc, instruction.pc);
      return buildEncoded(instruction, encodeI(opcode, rs, rt, immediate));
    }

    if (mnemonic === "blez" || mnemonic === "bgtz") {
      expectOperandCount(instruction, 2);
      const rs = parseRegister(operands[0]);
      const targetPc = getLabelPc(operands[1], labels);
      const immediate = encodeBranchOffset(targetPc, instruction.pc);
      return buildEncoded(instruction, encodeI(opcode, rs, 0, immediate));
    }

    expectOperandCount(instruction, 3);
    const rt = parseRegister(operands[0]);
    const rs = parseRegister(operands[1]);
    const immediate = parseImmediate(operands[2]);
    return buildEncoded(instruction, encodeI(opcode, rs, rt, immediate));
  }

  if (mnemonic === "bltz" || mnemonic === "bgez") {
    expectOperandCount(instruction, 2);
    const opcode = 0x01;
    const rs = parseRegister(operands[0]);
    const rt = mnemonic === "bltz" ? 0x00 : 0x01;
    const targetPc = getLabelPc(operands[1], labels);
    const immediate = encodeBranchOffset(targetPc, instruction.pc);
    return buildEncoded(instruction, encodeI(opcode, rs, rt, immediate));
  }

  if (mnemonic in R_FUNCT) {
    const funct = R_FUNCT[mnemonic];

    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic)) {
      expectOperandCount(instruction, 3);
      const rd = parseRegister(operands[0]);
      const rs = parseRegister(operands[1]);
      const rt = parseRegister(operands[2]);
      return buildEncoded(instruction, encodeR(rs, rt, rd, 0, funct));
    }

    if (["sll", "srl", "sra"].includes(mnemonic)) {
      expectOperandCount(instruction, 3);
      const rd = parseRegister(operands[0]);
      const rt = parseRegister(operands[1]);
      const shamt = parseImmediate(operands[2]);
      return buildEncoded(instruction, encodeR(0, rt, rd, shamt, funct));
    }

    if (["sllv", "srlv", "srav"].includes(mnemonic)) {
      expectOperandCount(instruction, 3);
      const rd = parseRegister(operands[0]);
      const rt = parseRegister(operands[1]);
      const rs = parseRegister(operands[2]);
      return buildEncoded(instruction, encodeR(rs, rt, rd, 0, funct));
    }

    if (["mult", "multu", "div", "divu"].includes(mnemonic)) {
      expectOperandCount(instruction, 2);
      const rs = parseRegister(operands[0]);
      const rt = parseRegister(operands[1]);
      return buildEncoded(instruction, encodeR(rs, rt, 0, 0, funct));
    }

    if (mnemonic === "jr") {
      expectOperandCount(instruction, 1);
      const rs = parseRegister(operands[0]);
      return buildEncoded(instruction, encodeR(rs, 0, 0, 0, funct));
    }

    if (mnemonic === "jalr") {
      if (operands.length === 1) {
        const rs = parseRegister(operands[0]);
        return buildEncoded(instruction, encodeR(rs, 0, 31, 0, funct));
      }
      expectOperandCount(instruction, 2);
      const rd = parseRegister(operands[0]);
      const rs = parseRegister(operands[1]);
      return buildEncoded(instruction, encodeR(rs, 0, rd, 0, funct));
    }

    if (["mfhi", "mflo"].includes(mnemonic)) {
      expectOperandCount(instruction, 1);
      const rd = parseRegister(operands[0]);
      return buildEncoded(instruction, encodeR(0, 0, rd, 0, funct));
    }

    if (["mthi", "mtlo"].includes(mnemonic)) {
      expectOperandCount(instruction, 1);
      const rs = parseRegister(operands[0]);
      return buildEncoded(instruction, encodeR(rs, 0, 0, 0, funct));
    }

    if (mnemonic === "syscall" || mnemonic === "break") {
      expectOperandCount(instruction, 0);
      return buildEncoded(instruction, encodeR(0, 0, 0, 0, funct));
    }
  }

  throw new Error(`Line ${instruction.lineNumber}: unsupported instruction "${mnemonic}"`);
}
