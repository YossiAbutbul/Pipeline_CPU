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

function validateFormulaExpression(expression: string): void {
  if (/[+\-*/%&|^]\s*$/.test(expression)) {
    const trailingOperator = expression.match(/([+\-*/%&|^])\s*$/)?.[1] ?? "";
    throw new Error(`Expression cannot end with operator "${trailingOperator}"`);
  }

  let parenBalance = 0;
  for (const char of expression) {
    if (char === "(") {
      parenBalance += 1;
    } else if (char === ")") {
      parenBalance -= 1;
    }

    if (parenBalance < 0) {
      throw new Error('Expression has an unexpected ")"');
    }
  }

  if (parenBalance > 0) {
    throw new Error('Expression is missing a closing ")"');
  }
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

  validateFormulaExpression(expression);

  const resolved = constantMode
    ? expression
    : expression.replace(/\b(index|num|number)\b/g, String(registerNumber)).replace(/\bi\b/g, String(registerNumber));

  let result: unknown;
  try {
    result = Function(`"use strict"; return (${resolved});`)();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Formula syntax is invalid");
    }
    throw error;
  }
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
