import type { CompilationResult } from "./types";

export function logCompilationToConsole(result: CompilationResult) {
  const rows = result.encoded.map((entry) => ({
    line: entry.lineNumber,
    pc: `0x${entry.pc.toString(16).toUpperCase().padStart(8, "0")}`,
    source: entry.source,
    format: entry.kind,
    binary: entry.binary,
    hex: entry.hex,
    fields: JSON.stringify(entry.fields),
  }));

  console.log("[MIPS Compiler] 32-bit conversion result");
  console.table(rows);
}
