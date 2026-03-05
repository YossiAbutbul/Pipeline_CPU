export const INSTRUCTIONS = [
  "add","addu","sub","subu","and","or","xor","nor","slt","sltu",
  "sll","srl","sra","sllv","srlv","srav",
  "mult","multu","div","divu","mfhi","mflo","mthi","mtlo",
  "jr","jalr",
  "addi","addiu","andi","ori","xori","slti","sltiu","lui",
  "lw","sw","lb","lbu","lh","lhu","sb","sh",
  "beq","bne","blez","bgtz","bltz","bgez","j","jal",
  "move","li","la","nop",
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