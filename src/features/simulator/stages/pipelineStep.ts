import { applyWriteBack } from "./executeWriteBack";
import { resolveControlFlow } from "./controlFlow";
import { shouldStallForLoadUseHazard } from "./hazards";
import { runMemoryStage } from "./memoryStage";
import type { ForwardStepInput, ForwardStepResult } from "../core/types";

export function stepPipelineForward(input: ForwardStepInput): ForwardStepResult {
  const {
    pipeline,
    pipelineInstructionIndices,
    pipelineEffects,
    nextInstructionIndex,
    instructions,
    labels,
    pcToInstructionIndex,
    registerValues,
    memoryWords,
  } = input;

  let incomingInstructionIndex = instructions[nextInstructionIndex] ? nextInstructionIndex : null;
  const wbInstructionIndex = pipelineInstructionIndices.MEM;
  const wbInstruction = wbInstructionIndex !== null ? instructions[wbInstructionIndex] : null;
  const wbEffect = pipelineEffects.MEM;
  const memInstructionIndex = pipelineInstructionIndices.EX;
  const memInstruction = memInstructionIndex !== null ? instructions[memInstructionIndex] : null;
  const exInstruction = pipelineInstructionIndices.EX !== null ? instructions[pipelineInstructionIndices.EX] : null;
  const idInstruction = pipelineInstructionIndices.ID !== null ? instructions[pipelineInstructionIndices.ID] : null;
  const memResult = runMemoryStage(memInstruction, registerValues, memoryWords);
  const hasLoadUseHazard = shouldStallForLoadUseHazard(exInstruction, idInstruction);
  const controlFlow = resolveControlFlow(exInstruction, registerValues, labels, pcToInstructionIndex);
  const isControlFlowTaken = !hasLoadUseHazard && controlFlow.taken && controlFlow.targetInstructionIndex !== null;

  if (isControlFlowTaken) {
    incomingInstructionIndex = controlFlow.targetInstructionIndex;
  } else if (hasLoadUseHazard) {
    incomingInstructionIndex = pipelineInstructionIndices.IF;
  }

  const incomingInstructionText = incomingInstructionIndex !== null ? instructions[incomingInstructionIndex]?.source ?? null : null;

  const snapshot = {
    pipeline: { ...pipeline },
    pipelineInstructionIndices: { ...pipelineInstructionIndices },
    pipelineEffects: { ...pipelineEffects },
    nextInstructionIndex,
    registerValues: { ...registerValues },
    memoryDeltas: memResult.deltas,
    changedMemoryWords: memResult.changedMemoryWords,
  };

  const nextInstructionIndexValue =
    hasLoadUseHazard ? nextInstructionIndex : incomingInstructionIndex !== null ? incomingInstructionIndex + 1 : nextInstructionIndex;

  return {
    snapshot,
    registerValues: applyWriteBack(wbInstruction, registerValues, wbEffect),
    memoryWords: memResult.memoryWords,
    memoryDeltas: memResult.deltas,
    changedMemoryWords: memResult.changedMemoryWords,
    pipeline: {
      IF: incomingInstructionText,
      ID: isControlFlowTaken ? null : hasLoadUseHazard ? pipeline.ID : pipeline.IF,
      EX: isControlFlowTaken ? null : hasLoadUseHazard ? "bubble" : pipeline.ID,
      MEM: pipeline.EX,
      WB: pipeline.MEM,
    },
    pipelineInstructionIndices: {
      IF: incomingInstructionIndex,
      ID: isControlFlowTaken ? null : hasLoadUseHazard ? pipelineInstructionIndices.ID : pipelineInstructionIndices.IF,
      EX: isControlFlowTaken ? null : hasLoadUseHazard ? null : pipelineInstructionIndices.ID,
      MEM: pipelineInstructionIndices.EX,
      WB: pipelineInstructionIndices.MEM,
    },
    pipelineEffects: {
      IF: null,
      ID: isControlFlowTaken ? null : hasLoadUseHazard ? pipelineEffects.ID : pipelineEffects.IF,
      EX: isControlFlowTaken ? null : hasLoadUseHazard ? null : pipelineEffects.ID,
      MEM: memResult.effect,
      WB: pipelineEffects.MEM,
    },
    nextInstructionIndex: nextInstructionIndexValue,
  };
}
