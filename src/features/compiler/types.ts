export type EncodingKind = "R" | "I" | "J" | "RAW";

export type ParsedInstruction = {
  source: string;
  mnemonic: string;
  operands: string[];
  lineNumber: number;
  pc: number;
};

export type EncodedInstruction = {
  source: string;
  lineNumber: number;
  pc: number;
  kind: EncodingKind;
  binary: string;
  hex: string;
  word: number;
  fields: Record<string, number>;
};

export type CompilationResult = {
  encoded: EncodedInstruction[];
  labels: Record<string, number>;
};
