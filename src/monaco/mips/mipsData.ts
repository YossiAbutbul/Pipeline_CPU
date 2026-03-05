export const INSTRUCTIONS = [
  "add","addu","sub","subu","and","or","xor","nor","slt","sltu",
  "sll","srl","sra","sllv","srlv","srav",
  "mult","multu","div","divu","mfhi","mflo","mthi","mtlo",
  "jr","jalr",
  "addi","addiu","andi","ori","xori","slti","sltiu","lui",
  "lw","sw","lb","lbu","lh","lhu","sb","sh",
  "beq","bne","blez","bgtz","bltz","bgez","j","jal",
  "move","li","la","nop","bubble",
  "syscall","break",
] as const;

export const DIRECTIVES = [
  ".data",".text",".globl",".global",".word",".half",".byte",".asciiz",".ascii",".space",".align",
] as const;

export const REG_ALIASES = [
  "zero","at","v0","v1","a0","a1","a2","a3",
  "t0","t1","t2","t3","t4","t5","t6","t7","t8","t9",
  "s0","s1","s2","s3","s4","s5","s6","s7",
  "k0","k1","gp","sp","fp","ra",
] as const;

export const REG_INFO: Record<string, { num: number; desc: string }> = {
  zero: { num: 0, desc: "constant 0" },
  at: { num: 1, desc: "assembler temporary" },
  v0: { num: 2, desc: "return value" },
  v1: { num: 3, desc: "return value" },
  a0: { num: 4, desc: "arg 0" },
  a1: { num: 5, desc: "arg 1" },
  a2: { num: 6, desc: "arg 2" },
  a3: { num: 7, desc: "arg 3" },
  t0: { num: 8, desc: "temporary" },
  t1: { num: 9, desc: "temporary" },
  t2: { num: 10, desc: "temporary" },
  t3: { num: 11, desc: "temporary" },
  t4: { num: 12, desc: "temporary" },
  t5: { num: 13, desc: "temporary" },
  t6: { num: 14, desc: "temporary" },
  t7: { num: 15, desc: "temporary" },
  t8: { num: 24, desc: "temporary" },
  t9: { num: 25, desc: "temporary" },
  s0: { num: 16, desc: "saved" },
  s1: { num: 17, desc: "saved" },
  s2: { num: 18, desc: "saved" },
  s3: { num: 19, desc: "saved" },
  s4: { num: 20, desc: "saved" },
  s5: { num: 21, desc: "saved" },
  s6: { num: 22, desc: "saved" },
  s7: { num: 23, desc: "saved" },
  k0: { num: 26, desc: "kernel" },
  k1: { num: 27, desc: "kernel" },
  gp: { num: 28, desc: "global pointer" },
  sp: { num: 29, desc: "stack pointer" },
  fp: { num: 30, desc: "frame pointer" },
  ra: { num: 31, desc: "return address" },
};

export type InsDoc = { sig: string; summary: string };

export const INSTRUCTION_DOCS: Record<string, InsDoc> = {
  // R-type
  add: { sig: "add rd, rs, rt", summary: "rd = rs + rt (signed)" },
  addu: { sig: "addu rd, rs, rt", summary: "rd = rs + rt" },
  sub: { sig: "sub rd, rs, rt", summary: "rd = rs - rt (signed)" },
  subu: { sig: "subu rd, rs, rt", summary: "rd = rs - rt" },
  and: { sig: "and rd, rs, rt", summary: "rd = rs & rt" },
  or: { sig: "or rd, rs, rt", summary: "rd = rs | rt" },
  xor: { sig: "xor rd, rs, rt", summary: "rd = rs ^ rt" },
  nor: { sig: "nor rd, rs, rt", summary: "rd = ~(rs | rt)" },
  slt: { sig: "slt rd, rs, rt", summary: "rd = (rs < rt) ? 1 : 0 (signed)" },
  sltu: { sig: "sltu rd, rs, rt", summary: "rd = (rs < rt) ? 1 : 0 (unsigned)" },

  // shifts
  sll: { sig: "sll rd, rt, shamt", summary: "rd = rt << shamt" },
  srl: { sig: "srl rd, rt, shamt", summary: "rd = rt >>> shamt (logical)" },
  sra: { sig: "sra rd, rt, shamt", summary: "rd = rt >> shamt (arithmetic)" },
  sllv: { sig: "sllv rd, rt, rs", summary: "rd = rt << (rs[4:0])" },
  srlv: { sig: "srlv rd, rt, rs", summary: "rd = rt >>> (rs[4:0])" },
  srav: { sig: "srav rd, rt, rs", summary: "rd = rt >> (rs[4:0])" },

  // mult/div
  mult: { sig: "mult rs, rt", summary: "HI/LO = rs * rt (signed)" },
  multu: { sig: "multu rs, rt", summary: "HI/LO = rs * rt (unsigned)" },
  div: { sig: "div rs, rt", summary: "LO=quotient, HI=remainder (signed)" },
  divu: { sig: "divu rs, rt", summary: "LO=quotient, HI=remainder (unsigned)" },
  mfhi: { sig: "mfhi rd", summary: "rd = HI" },
  mflo: { sig: "mflo rd", summary: "rd = LO" },
  mthi: { sig: "mthi rs", summary: "HI = rs" },
  mtlo: { sig: "mtlo rs", summary: "LO = rs" },

  // jumps
  jr: { sig: "jr rs", summary: "PC = rs" },
  jalr: { sig: "jalr rd, rs", summary: "rd = return addr; PC = rs" },

  // I-type
  addi: { sig: "addi rt, rs, imm", summary: "rt = rs + imm (signed, traps on overflow)" },
  addiu: { sig: "addiu rt, rs, imm", summary: "rt = rs + imm (no overflow trap)" },
  andi: { sig: "andi rt, rs, imm", summary: "rt = rs & imm (zero-extended)" },
  ori: { sig: "ori rt, rs, imm", summary: "rt = rs | imm (zero-extended)" },
  xori: { sig: "xori rt, rs, imm", summary: "rt = rs ^ imm (zero-extended)" },
  slti: { sig: "slti rt, rs, imm", summary: "rt = (rs < imm) ? 1 : 0 (signed)" },
  sltiu: { sig: "sltiu rt, rs, imm", summary: "rt = (rs < imm) ? 1 : 0 (unsigned)" },
  lui: { sig: "lui rt, imm", summary: "rt = imm << 16" },

  // mem
  lw: { sig: "lw rt, offset(base)", summary: "rt = mem[base + offset]" },
  sw: { sig: "sw rt, offset(base)", summary: "mem[base + offset] = rt" },
  lb: { sig: "lb rt, offset(base)", summary: "rt = signExtend(mem8[base+off])" },
  lbu: { sig: "lbu rt, offset(base)", summary: "rt = zeroExtend(mem8[base+off])" },
  lh: { sig: "lh rt, offset(base)", summary: "rt = signExtend(mem16[base+off])" },
  lhu: { sig: "lhu rt, offset(base)", summary: "rt = zeroExtend(mem16[base+off])" },
  sb: { sig: "sb rt, offset(base)", summary: "mem8[base + offset] = rt[7:0]" },
  sh: { sig: "sh rt, offset(base)", summary: "mem16[base + offset] = rt[15:0]" },

  // branches/jumps
  beq: { sig: "beq rs, rt, label", summary: "branch if rs == rt" },
  bne: { sig: "bne rs, rt, label", summary: "branch if rs != rt" },
  blez: { sig: "blez rs, label", summary: "branch if rs <= 0" },
  bgtz: { sig: "bgtz rs, label", summary: "branch if rs > 0" },
  bltz: { sig: "bltz rs, label", summary: "branch if rs < 0" },
  bgez: { sig: "bgez rs, label", summary: "branch if rs >= 0" },
  j: { sig: "j label", summary: "jump to label" },
  jal: { sig: "jal label", summary: "$ra = return addr; jump to label" },

  // pseudo-ish / misc
  move: { sig: "move rd, rs", summary: "pseudo: rd = rs" },
  li: { sig: "li rt, imm", summary: "pseudo: load immediate" },
  la: { sig: "la rt, label", summary: "pseudo: load address of label" },
  nop: { sig: "nop", summary: "no operation" },
  bubble: { sig: "bubble", summary: "pipeline bubble / stall cycle marker" },
  syscall: { sig: "syscall", summary: "system call" },
  break: { sig: "break", summary: "breakpoint / trap" },
};
