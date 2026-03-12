import type { ParsedInstruction } from "@/features/compiler/types";

export class RuntimePipelineError extends Error {
  stage: string;

  constructor(stage: string, message: string) {
    super(message);
    this.name = "RuntimePipelineError";
    this.stage = stage;
  }
}

export function createRuntimeStageError(
  stage: string,
  instruction: ParsedInstruction | null,
  message: string,
) {
  const instructionSuffix = instruction ? ` while executing "${instruction.source}"` : "";
  return new RuntimePipelineError(stage, `${stage}: ${message}${instructionSuffix}`);
}
