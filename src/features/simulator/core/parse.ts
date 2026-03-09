export function parseImmediate(raw: string): number {
  const token = raw.trim();
  const parsed = token.toLowerCase().startsWith("0x") || token.toLowerCase().startsWith("-0x")
    ? Number.parseInt(token, 16)
    : Number(token);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`Invalid immediate "${raw}"`);
  }

  return parsed;
}

export function parseInitialPc(raw: string): number {
  const value = raw.trim();
  if (!value) {
    throw new Error("Initial PC is required");
  }

  const numeric = value.toLowerCase().startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  if (!Number.isInteger(numeric)) {
    throw new Error("Initial PC must be a valid integer (e.g. 0x00400000)");
  }
  if (numeric < 0 || numeric > 0xffff_ffff) {
    throw new Error("Initial PC must be within 32-bit unsigned range");
  }
  if (numeric % 4 !== 0) {
    throw new Error("Initial PC must be word-aligned (multiple of 4)");
  }

  return numeric >>> 0;
}
