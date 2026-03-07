import { encodeInstruction } from "./encoder";
import { logCompilationToConsole } from "./formatter";
import { parseProgram } from "./parser";
import type { CompilationResult } from "./types";

type CompileOptions = {
  initialPc?: number;
};

export function compileProgram(program: string, options: CompileOptions = {}): CompilationResult {
  const parsed = parseProgram(program, { initialPc: options.initialPc });
  const encoded = parsed.instructions.map((instruction) => encodeInstruction(instruction, parsed.labels));
  return {
    encoded,
    labels: parsed.labels,
  };
}

export function compileAndLog(program: string, options: CompileOptions = {}): CompilationResult {
  const result = compileProgram(program, options);
  logCompilationToConsole(result);
  return result;
}

export type { CompilationResult, EncodedInstruction } from "./types";
