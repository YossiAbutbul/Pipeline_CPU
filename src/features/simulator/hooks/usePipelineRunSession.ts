import { compileAndLog, compileProgram } from "@/features/compiler";
import { parseProgram } from "@/features/compiler/parser";
import { useMemo, useState } from "react";
import type { MemoryRuleConfig } from "@/app/store/appStore";
import { createMemoryFromRules } from "../runtime/memoryRuntime";
import { parseInitialPc } from "../core/parse";
import { buildPipelineSignalValues, type PipelineSignalValues } from "../signals/pipelineSignals";
import { stepPipelineForward } from "../stages/pipelineStep";
import { EMPTY_PIPELINE, EMPTY_PIPELINE_EFFECTS, EMPTY_PIPELINE_INDICES } from "../core/state";
import type {
  PipelineEffectSlots,
  PipelineInstructionSlots,
  PipelineSlots,
  PipelineSnapshot,
  SparseMemoryWords,
} from "../core/types";

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
  const [memoryWords, setMemoryWords] = useState<SparseMemoryWords>(() => createMemoryFromRules(memoryRules));
  const [changedMemoryWords, setChangedMemoryWords] = useState<number[]>([]);
  const [nextInstructionIndex, setNextInstructionIndex] = useState(0);
  const [history, setHistory] = useState<PipelineSnapshot[]>([]);
  const [runSessionActive, setRunSessionActive] = useState(false);

  const parsedProgram = useMemo(() => {
    try {
      const parsedInitialPc = parseInitialPc(initialPc);
      return parseProgram(program, { initialPc: parsedInitialPc });
    } catch {
      return parseProgram(program);
    }
  }, [initialPc, program]);
  const encodedInstructionHexByPc = useMemo(() => {
    try {
      const parsedInitialPc = parseInitialPc(initialPc);
      const result = compileProgram(program, { initialPc: parsedInitialPc });
      return result.encoded.reduce<Record<number, string>>((acc, instruction) => {
        acc[instruction.pc] = instruction.hex;
        return acc;
      }, {});
    } catch {
      try {
        const result = compileProgram(program);
        return result.encoded.reduce<Record<number, string>>((acc, instruction) => {
          acc[instruction.pc] = instruction.hex;
          return acc;
        }, {});
      } catch {
        return {};
      }
    }
  }, [initialPc, program]);
  const instructions = parsedProgram.instructions;
  const pcToInstructionIndex = useMemo(() => {
    const map = new Map<number, number>();
    instructions.forEach((instruction, index) => {
      map.set(instruction.pc, index);
    });
    return map;
  }, [instructions]);
  const hasInstructionsToInject = nextInstructionIndex < instructions.length;
  const hasPipelineWork = Object.values(pipelineInstructionIndices).some((value) => value !== null);
  const canStepForward = runSessionActive && (hasInstructionsToInject || hasPipelineWork);
  const canStepBackward = runSessionActive && history.length > 0;
  const hoveredSignalValues = useMemo<PipelineSignalValues>(() => {
    return buildPipelineSignalValues({
      instructions,
      pipelineInstructionIndices,
      encodedInstructionHexByPc,
      registerValues,
    });
  }, [encodedInstructionHexByPc, instructions, pipelineInstructionIndices, registerValues]);

  const resetPipeline = () => {
    setPipeline(EMPTY_PIPELINE);
    setPipelineInstructionIndices(EMPTY_PIPELINE_INDICES);
    setPipelineEffects(EMPTY_PIPELINE_EFFECTS);
    setMemoryWords(createMemoryFromRules(memoryRules));
    setChangedMemoryWords([]);
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
    setMemoryWords(createMemoryFromRules(memoryRules));
    setChangedMemoryWords([]);
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
      labels: parsedProgram.labels,
      pcToInstructionIndex,
      registerValues,
      memoryWords,
    });

    setHistory((prev) => [...prev, result.snapshot]);
    setPipeline(result.pipeline);
    setPipelineInstructionIndices(result.pipelineInstructionIndices);
    setPipelineEffects(result.pipelineEffects);
    setMemoryWords(result.memoryWords);
    setChangedMemoryWords(result.changedMemoryWords);
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
      setMemoryWords((currentMemory) => {
        if (previous.memoryDeltas.length === 0) {
          return currentMemory;
        }

        const reverted = new Map(currentMemory);
        for (const delta of previous.memoryDeltas) {
          if ((delta.previousValue >>> 0) === 0) {
            reverted.delete(delta.wordIndex);
          } else {
            reverted.set(delta.wordIndex, delta.previousValue >>> 0);
          }
        }
        return reverted;
      });
      setChangedMemoryWords(previous.changedMemoryWords);
      setNextInstructionIndex(previous.nextInstructionIndex);
      onRegisterValuesChange(previous.registerValues);

      return prev.slice(0, -1);
    });
  };

  return {
    pipeline,
    memoryWords,
    changedMemoryWords,
    runSessionActive,
    canStepForward,
    canStepBackward,
    resetPipeline,
    run,
    stepForward,
    stepBackward,
    hoveredSignalValues,
  };
}
