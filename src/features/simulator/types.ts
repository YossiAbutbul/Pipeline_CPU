import type { ParsedInstruction } from "@/features/compiler/types";

export const PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;

export type StageName = (typeof PIPELINE_STAGES)[number];
export type PipelineSlots = Record<StageName, string | null>;
export type PipelineInstructionSlots = Record<StageName, number | null>;

export type PipelineSnapshot = {
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  pipelineEffects: PipelineEffectSlots;
  nextInstructionIndex: number;
  registerValues: Record<string, string>;
  memoryBytes: Uint8Array;
};

export type WbWriteEffect = {
  registerNumber: number;
  value: number;
};

export type StageEffect = {
  wbWrite?: WbWriteEffect;
};

export type PipelineEffectSlots = Record<StageName, StageEffect | null>;

export type ForwardStepResult = {
  snapshot: PipelineSnapshot;
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  pipelineEffects: PipelineEffectSlots;
  nextInstructionIndex: number;
  registerValues: Record<string, string>;
  memoryBytes: Uint8Array;
};

export type ForwardStepInput = {
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  pipelineEffects: PipelineEffectSlots;
  nextInstructionIndex: number;
  instructions: ParsedInstruction[];
  registerValues: Record<string, string>;
  memoryBytes: Uint8Array;
};
