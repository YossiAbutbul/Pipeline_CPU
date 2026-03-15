import { applyWriteBack } from "./executeWriteBack";
import { resolveControlFlow } from "./controlFlow";
import { shouldStallForLoadUseHazard } from "./hazards";
import { runMemoryStage } from "./memoryStage";
import { applySignalComponentToPathNumber } from "@/features/components/placement/componentSignalRuntime";
import { resolveForwardedExOperands } from "../signals/pipelineSignals";
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
    activeSignalComponent,
  } = input;

  let incomingInstructionIndex = instructions[nextInstructionIndex] ? nextInstructionIndex : null;
  const wbInstructionIndex = pipelineInstructionIndices.WB;
  const wbInstruction = wbInstructionIndex !== null ? instructions[wbInstructionIndex] : null;
  const wbEffect = pipelineEffects.WB;
  const currentMemInstructionIndex = pipelineInstructionIndices.MEM;
  const currentMemInstruction =
    currentMemInstructionIndex !== null ? instructions[currentMemInstructionIndex] : null;
  const memInstructionIndex = pipelineInstructionIndices.EX;
  const memInstruction = memInstructionIndex !== null ? instructions[memInstructionIndex] : null;
  const exInstruction = pipelineInstructionIndices.EX !== null ? instructions[pipelineInstructionIndices.EX] : null;
  const idInstruction = pipelineInstructionIndices.ID !== null ? instructions[pipelineInstructionIndices.ID] : null;
  const exResolvedValues = resolveForwardedExOperands({
    exInstruction: memInstruction,
    memInstruction: currentMemInstruction,
    wbInstruction,
    pipelineEffects,
    registerValues,
    memoryWords,
  });
  const memResult = runMemoryStage(
    memInstruction,
    registerValues,
    memoryWords,
    activeSignalComponent,
    {
      aluResult: exResolvedValues.aluResult ? (Number.parseInt(exResolvedValues.aluResult, 16) >>> 0) : undefined,
      forwardedBValue: exResolvedValues.forwardedBValue
        ? (Number.parseInt(exResolvedValues.forwardedBValue, 16) >>> 0)
        : undefined,
    },
  );
  const hasLoadUseHazard = shouldStallForLoadUseHazard(exInstruction, idInstruction);
  const controlFlow = resolveControlFlow(
    exInstruction,
    registerValues,
    labels,
    pcToInstructionIndex,
    activeSignalComponent,
  );
  const isControlFlowTaken = !hasLoadUseHazard && controlFlow.taken && controlFlow.targetInstructionIndex !== null;

  if (isControlFlowTaken && controlFlow.targetInstructionIndex !== null) {
    const selectedInstruction = instructions[controlFlow.targetInstructionIndex] ?? null;
    const selectedPc = selectedInstruction?.pc ?? null;
    const transformedSelectedPc =
      applySignalComponentToPathNumber(activeSignalComponent, "nextPcSelected", selectedPc) ?? selectedPc;
    if (transformedSelectedPc !== null) {
      incomingInstructionIndex = pcToInstructionIndex.get(transformedSelectedPc) ?? null;
    } else {
      incomingInstructionIndex = null;
    }
  }

  if (!isControlFlowTaken && hasLoadUseHazard) {
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
    hasLoadUseHazard
      ? nextInstructionIndex
      : incomingInstructionIndex !== null
        ? incomingInstructionIndex + 1
        : isControlFlowTaken
          ? instructions.length
          : nextInstructionIndex;

  return {
    snapshot,
    registerValues: applyWriteBack(wbInstruction, registerValues, wbEffect, activeSignalComponent),
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
