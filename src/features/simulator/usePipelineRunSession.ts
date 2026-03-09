import { compileAndLog } from "@/features/compiler";
import { parseProgram } from "@/features/compiler/parser";
import { useMemo, useState } from "react";
import type { MemoryRuleConfig } from "@/app/store/appStore";
import { createMemoryFromRules } from "./memoryRuntime";
import { parseInitialPc } from "./parse";
import { stepPipelineForward } from "./pipelineStep";
import { EMPTY_PIPELINE, EMPTY_PIPELINE_EFFECTS, EMPTY_PIPELINE_INDICES } from "./state";
import type { PipelineEffectSlots, PipelineInstructionSlots, PipelineSlots, PipelineSnapshot } from "./types";

type UsePipelineRunSessionArgs = {
  program: string;
  initialPc: string;
  memoryRules: MemoryRuleConfig[];
  registerValues: Record<string, string>;
  onRegisterValuesChange: (values: Record<string, string>) => void;
};

export function usePipelineRunSession({
  program,
  initialPc,
  memoryRules,
  registerValues,
  onRegisterValuesChange,
}: UsePipelineRunSessionArgs) {
  const [pipeline, setPipeline] = useState<PipelineSlots>(EMPTY_PIPELINE);
  const [pipelineInstructionIndices, setPipelineInstructionIndices] =
    useState<PipelineInstructionSlots>(EMPTY_PIPELINE_INDICES);
  const [pipelineEffects, setPipelineEffects] = useState<PipelineEffectSlots>(EMPTY_PIPELINE_EFFECTS);
  const [memoryBytes, setMemoryBytes] = useState<Uint8Array>(() => createMemoryFromRules(memoryRules));
  const [nextInstructionIndex, setNextInstructionIndex] = useState(0);
  const [history, setHistory] = useState<PipelineSnapshot[]>([]);
  const [runSessionActive, setRunSessionActive] = useState(false);

  const parsedProgram = useMemo(() => parseProgram(program), [program]);
  const instructions = parsedProgram.instructions;
  const hasInstructionsToInject = nextInstructionIndex < instructions.length;
  const hasPipelineWork = Object.values(pipelineInstructionIndices).some((value) => value !== null);
  const canStepForward = runSessionActive && (hasInstructionsToInject || hasPipelineWork);
  const canStepBackward = runSessionActive && history.length > 0;

  const resetPipeline = () => {
    setPipeline(EMPTY_PIPELINE);
    setPipelineInstructionIndices(EMPTY_PIPELINE_INDICES);
    setPipelineEffects(EMPTY_PIPELINE_EFFECTS);
    setMemoryBytes(createMemoryFromRules(memoryRules));
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(false);
  };

  const run = () => {
    let parsedInitialPc: number;
    try {
      parsedInitialPc = parseInitialPc(initialPc);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[MIPS Compiler] Failed to compile: ${message}`);
      setRunSessionActive(false);
      return;
    }

    try {
      compileAndLog(program, { initialPc: parsedInitialPc });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[MIPS Compiler] Failed to compile: ${message}`);
      setRunSessionActive(false);
      return;
    }

    setPipeline(EMPTY_PIPELINE);
    setPipelineInstructionIndices(EMPTY_PIPELINE_INDICES);
    setPipelineEffects(EMPTY_PIPELINE_EFFECTS);
    setMemoryBytes(createMemoryFromRules(memoryRules));
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(true);
  };

  const stepForward = () => {
    if (!canStepForward) {
      return;
    }

    const result = stepPipelineForward({
      pipeline,
      pipelineInstructionIndices,
      pipelineEffects,
      nextInstructionIndex,
      instructions,
      registerValues,
      memoryBytes,
    });

    setHistory((prev) => [...prev, result.snapshot]);
    setPipeline(result.pipeline);
    setPipelineInstructionIndices(result.pipelineInstructionIndices);
    setPipelineEffects(result.pipelineEffects);
    setMemoryBytes(result.memoryBytes);
    setNextInstructionIndex(result.nextInstructionIndex);

    if (result.registerValues !== registerValues) {
      onRegisterValuesChange(result.registerValues);
    }
  };

  const stepBackward = () => {
    setHistory((prev) => {
      const previous = prev[prev.length - 1];
      if (!previous) {
        return prev;
      }

      setPipeline(previous.pipeline);
      setPipelineInstructionIndices(previous.pipelineInstructionIndices);
      setPipelineEffects(previous.pipelineEffects);
      setMemoryBytes(previous.memoryBytes.slice());
      setNextInstructionIndex(previous.nextInstructionIndex);
      onRegisterValuesChange(previous.registerValues);

      return prev.slice(0, -1);
    });
  };

  return {
    pipeline,
    canStepForward,
    canStepBackward,
    resetPipeline,
    run,
    stepForward,
    stepBackward,
  };
}
