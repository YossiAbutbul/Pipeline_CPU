import { applyWriteBack } from "./executeWriteBack";
import { runMemoryStage } from "./memoryStage";
import type { ForwardStepInput, ForwardStepResult } from "./types";

export function stepPipelineForward(input: ForwardStepInput): ForwardStepResult {
  const { pipeline, pipelineInstructionIndices, pipelineEffects, nextInstructionIndex, instructions, registerValues, memoryBytes } = input;

  const incomingInstructionIndex = instructions[nextInstructionIndex] ? nextInstructionIndex : null;
  const incomingInstructionText = incomingInstructionIndex !== null ? instructions[incomingInstructionIndex].source : null;
  const wbInstructionIndex = pipelineInstructionIndices.MEM;
  const wbInstruction = wbInstructionIndex !== null ? instructions[wbInstructionIndex] : null;
  const wbEffect = pipelineEffects.MEM;
  const memInstructionIndex = pipelineInstructionIndices.EX;
  const memInstruction = memInstructionIndex !== null ? instructions[memInstructionIndex] : null;
  const memResult = runMemoryStage(memInstruction, registerValues, memoryBytes);

  const snapshot = {
    pipeline: { ...pipeline },
    pipelineInstructionIndices: { ...pipelineInstructionIndices },
    pipelineEffects: { ...pipelineEffects },
    nextInstructionIndex,
    registerValues: { ...registerValues },
    memoryBytes: memoryBytes.slice(),
  };

  return {
    snapshot,
    registerValues: applyWriteBack(wbInstruction, registerValues, wbEffect),
    memoryBytes: memResult.memoryBytes,
    pipeline: {
      IF: incomingInstructionText,
      ID: pipeline.IF,
      EX: pipeline.ID,
      MEM: pipeline.EX,
      WB: pipeline.MEM,
    },
    pipelineInstructionIndices: {
      IF: incomingInstructionIndex,
      ID: pipelineInstructionIndices.IF,
      EX: pipelineInstructionIndices.ID,
      MEM: pipelineInstructionIndices.EX,
      WB: pipelineInstructionIndices.MEM,
    },
    pipelineEffects: {
      IF: null,
      ID: null,
      EX: null,
      MEM: memResult.effect,
      WB: pipelineEffects.MEM,
    },
    nextInstructionIndex: incomingInstructionIndex !== null ? nextInstructionIndex + 1 : nextInstructionIndex,
  };
}
