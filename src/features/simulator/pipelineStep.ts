import { applyWriteBack } from "./executeWriteBack";
import type { ForwardStepInput, ForwardStepResult } from "./types";

export function stepPipelineForward(input: ForwardStepInput): ForwardStepResult {
  const { pipeline, pipelineInstructionIndices, nextInstructionIndex, instructions, registerValues } = input;

  const incomingInstructionIndex = instructions[nextInstructionIndex] ? nextInstructionIndex : null;
  const incomingInstructionText = incomingInstructionIndex !== null ? instructions[incomingInstructionIndex].source : null;
  const wbInstructionIndex = pipelineInstructionIndices.MEM;
  const wbInstruction = wbInstructionIndex !== null ? instructions[wbInstructionIndex] : null;

  const snapshot = {
    pipeline: { ...pipeline },
    pipelineInstructionIndices: { ...pipelineInstructionIndices },
    nextInstructionIndex,
    registerValues: { ...registerValues },
  };

  return {
    snapshot,
    registerValues: applyWriteBack(wbInstruction, registerValues),
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
    nextInstructionIndex: incomingInstructionIndex !== null ? nextInstructionIndex + 1 : nextInstructionIndex,
  };
}
