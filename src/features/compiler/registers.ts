import { REG_INFO } from "@/monaco/mips/mipsData";

export function parseRegister(token: string): number {
  const normalized = token.trim().toLowerCase();
  if (!normalized.startsWith("$")) {
    throw new Error(`Invalid register "${token}"`);
  }

  const body = normalized.slice(1);
  if (/^\d+$/.test(body)) {
    const num = Number(body);
    if (Number.isInteger(num) && num >= 0 && num <= 31) {
      return num;
    }
  }

  const alias = REG_INFO[body];
  if (alias) {
    return alias.num;
  }

  throw new Error(`Unknown register "${token}"`);
}
