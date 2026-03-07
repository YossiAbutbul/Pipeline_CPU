import { REG_ALIASES, REG_INFO } from "@/monaco/mips/mipsData";

export type RegisterDef = {
  alias: string;
  num: number;
};

export const REGISTERS: RegisterDef[] = REG_ALIASES.map((alias) => ({
  alias,
  num: REG_INFO[alias].num,
})).sort((a, b) => a.num - b.num);

export function toHex32(value: number): string {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function parseRegisterValue(raw: string): number {
  const text = raw.trim();
  if (!text) {
    return 0;
  }

  const parsed = text.toLowerCase().startsWith("0x") ? Number.parseInt(text, 16) : Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`Invalid value "${raw}"`);
  }

  return parsed >>> 0;
}

export function evaluateRegisterFormula(formula: string, registerNumber: number): number {
  const normalized = formula.trim();
  if (!normalized) {
    throw new Error("Formula is empty");
  }

  const isSafe = /^[=0-9a-fxA-F+\-*/()%<>&|^~\sA-Za-z]+$/.test(normalized);
  if (!isSafe) {
    throw new Error("Formula contains unsupported characters");
  }

  const assignmentMatch = normalized.match(/^(index|num|number|i)\s*=\s*(.+)$/i);
  const constantMode = normalized.startsWith("=") || Boolean(assignmentMatch);
  const expression = normalized.startsWith("=")
    ? normalized.slice(1).trim()
    : assignmentMatch
      ? assignmentMatch[2].trim()
      : normalized;
  if (!expression) {
    throw new Error("Formula is empty");
  }

  const resolved = constantMode
    ? expression
    : expression.replace(/\b(index|num|number)\b/g, String(registerNumber)).replace(/\bi\b/g, String(registerNumber));

  const result = Function(`"use strict"; return (${resolved});`)();
  if (!Number.isFinite(result) || !Number.isInteger(result)) {
    throw new Error("Formula must produce an integer");
  }

  return (result as number) >>> 0;
}

export function createDefaultRegisterValues(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const reg of REGISTERS) {
    values[reg.alias] = "0x00000000";
  }
  return values;
}
