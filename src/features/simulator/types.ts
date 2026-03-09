import type { ParsedInstruction } from "@/features/compiler/types";

export const PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;

export type StageName = (typeof PIPELINE_STAGES)[number];
export type PipelineSlots = Record<StageName, string | null>;
export type PipelineInstructionSlots = Record<StageName, number | null>;

export type PipelineSnapshot = {
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  nextInstructionIndex: number;
  registerValues: Record<string, string>;
};

export type ForwardStepResult = {
  snapshot: PipelineSnapshot;
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  nextInstructionIndex: number;
  registerValues: Record<string, string>;
};

export type ForwardStepInput = {
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  nextInstructionIndex: number;
  instructions: ParsedInstruction[];
  registerValues: Record<string, string>;
};
