import type { MemoryRuleConfig } from "@/app/store/appStore";
import { compileProgram } from "@/features/compiler";
import { parseProgram } from "@/features/compiler/parser";
import { getActiveSignalComponent } from "@/features/components/placement/componentSignalRuntime";
import type { PlacedComponent } from "@/features/components/placement/usePendingComponentPlacement";
import { PATH_SIGNAL_MAP } from "@/features/pipelineCanvas/pipelineHoverMap";
import { createDefaultRegisterValues, toHex32 } from "@/features/statePanels/registerEditorModel";
import { parseInitialPc } from "../core/parse";
import { EMPTY_PIPELINE, EMPTY_PIPELINE_EFFECTS, EMPTY_PIPELINE_INDICES } from "../core/state";
import type { PipelineEffectSlots, PipelineInstructionSlots, PipelineSlots } from "../core/types";
import { createMemoryFromRules } from "../runtime/memoryRuntime";
import { stepPipelineForward } from "../stages/pipelineStep";

type ComponentPathTestInput = {
  program: string;
  pathId: string;
  componentLabel: string;
  initialPc?: string;
  maxSteps?: number;
  registerValues?: Record<string, string>;
  memoryRules?: MemoryRuleConfig[];
  expected?: {
    status?: "completed" | "step_limit";
    maxSteps?: number;
    registers?: Record<string, string>;
    memoryWords?: Record<string, string>;
  };
};

type ComponentPathTestMismatch = {
  field: string;
  expected: string | number;
  actual: string | number | undefined;
};

type ComponentPathTestResult = {
  status: "completed" | "step_limit";
  steps: number;
  component: {
    pathId: string;
    componentLabel: string;
    signalKey: string | null;
  };
  finalRegisters: Record<string, string>;
  finalMemoryWords: Record<string, string>;
  finalPipeline: PipelineSlots;
  finalPipelineInstructionIndices: PipelineInstructionSlots;
  finalPipelineEffects: PipelineEffectSlots;
  nextInstructionIndex: number;
  expected?: ComponentPathTestInput["expected"];
  pass?: boolean;
  mismatches?: ComponentPathTestMismatch[];
};

type BaseComponentPathTestResult = Omit<ComponentPathTestResult, "expected" | "pass" | "mismatches">;

function toMemoryWordRecord(memoryWords: Map<number, number>) {
  return Array.from(memoryWords.entries())
    .sort((a, b) => a[0] - b[0])
    .reduce<Record<string, string>>((acc, [wordIndex, value]) => {
      acc[String(wordIndex)] = toHex32(value);
      return acc;
    }, {});
}

function createPlacedComponent(pathId: string, componentLabel: string): PlacedComponent[] {
  return [
    {
      id: 1,
      label: componentLabel,
      pathId,
      signalKey: PATH_SIGNAL_MAP[pathId]?.key ?? null,
      x: 0,
      y: 0,
    },
  ];
}

function buildAssertions(
  expected: ComponentPathTestInput["expected"] | undefined,
  result: BaseComponentPathTestResult,
): Pick<ComponentPathTestResult, "expected" | "pass" | "mismatches"> {
  if (!expected) {
    return {};
  }

  const mismatches: ComponentPathTestMismatch[] = [];

  if (expected.status && expected.status !== result.status) {
    mismatches.push({
      field: "status",
      expected: expected.status,
      actual: result.status,
    });
  }

  if (typeof expected.maxSteps === "number" && result.steps > expected.maxSteps) {
    mismatches.push({
      field: "steps",
      expected: expected.maxSteps,
      actual: result.steps,
    });
  }

  Object.entries(expected.registers ?? {}).forEach(([registerName, expectedValue]) => {
    const actualValue = result.finalRegisters[registerName];
    if (actualValue !== expectedValue) {
      mismatches.push({
        field: `registers.${registerName}`,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  });

  Object.entries(expected.memoryWords ?? {}).forEach(([wordIndex, expectedValue]) => {
    const actualValue = result.finalMemoryWords[wordIndex];
    if (actualValue !== expectedValue) {
      mismatches.push({
        field: `memoryWords.${wordIndex}`,
        expected: expectedValue,
        actual: actualValue,
      });
    }
  });

  return {
    expected,
    pass: mismatches.length === 0,
    mismatches,
  };
}

export function runComponentPathTest({
  program,
  pathId,
  componentLabel,
  initialPc = "0x00400000",
  maxSteps = 64,
  registerValues,
  memoryRules = [],
  expected,
}: ComponentPathTestInput): ComponentPathTestResult {
  const parsedInitialPc = parseInitialPc(initialPc);
  const parsedProgram = parseProgram(program, { initialPc: parsedInitialPc });
  compileProgram(program, { initialPc: parsedInitialPc });

  const instructions = parsedProgram.instructions;
  const pcToInstructionIndex = new Map<number, number>();
  instructions.forEach((instruction, index) => {
    pcToInstructionIndex.set(instruction.pc, index);
  });

  const activeSignalComponent = getActiveSignalComponent(createPlacedComponent(pathId, componentLabel));
  let pipeline: PipelineSlots = { ...EMPTY_PIPELINE };
  let pipelineInstructionIndices: PipelineInstructionSlots = { ...EMPTY_PIPELINE_INDICES };
  let pipelineEffects: PipelineEffectSlots = { ...EMPTY_PIPELINE_EFFECTS };
  let nextInstructionIndex = 0;
  let currentRegisterValues: Record<string, string> = {
    ...createDefaultRegisterValues(),
    ...registerValues,
    zero: "0x00000000",
  };
  let currentMemoryWords = createMemoryFromRules(memoryRules);
  let steps = 0;

  const firstInstruction = instructions[0] ?? null;
  if (firstInstruction) {
    pipeline = {
      ...EMPTY_PIPELINE,
      IF: firstInstruction.source,
    };
    pipelineInstructionIndices = {
      ...EMPTY_PIPELINE_INDICES,
      IF: 0,
    };
    nextInstructionIndex = 1;
  }

  while (steps < maxSteps) {
    const hasInstructionsToInject = nextInstructionIndex < instructions.length;
    const hasPipelineWork = Object.values(pipelineInstructionIndices).some((value) => value !== null);
    if (!hasInstructionsToInject && !hasPipelineWork) {
      const completedResult: BaseComponentPathTestResult = {
        status: "completed",
        steps,
        component: {
          pathId,
          componentLabel,
          signalKey: activeSignalComponent?.signalKey ?? null,
        },
        finalRegisters: currentRegisterValues,
        finalMemoryWords: toMemoryWordRecord(currentMemoryWords),
        finalPipeline: pipeline,
        finalPipelineInstructionIndices: pipelineInstructionIndices,
        finalPipelineEffects: pipelineEffects,
        nextInstructionIndex,
      };
      return {
        ...completedResult,
        ...buildAssertions(expected, completedResult),
      };
    }

    const result = stepPipelineForward({
      pipeline,
      pipelineInstructionIndices,
      pipelineEffects,
      nextInstructionIndex,
      instructions,
      labels: parsedProgram.labels,
      pcToInstructionIndex,
      registerValues: currentRegisterValues,
      memoryWords: currentMemoryWords,
      activeSignalComponent,
    });

    pipeline = result.pipeline;
    pipelineInstructionIndices = result.pipelineInstructionIndices;
    pipelineEffects = result.pipelineEffects;
    nextInstructionIndex = result.nextInstructionIndex;
    currentMemoryWords = result.memoryWords;
    currentRegisterValues = result.registerValues;
    steps += 1;
  }

  const stepLimitResult: BaseComponentPathTestResult = {
    status: "step_limit",
    steps,
    component: {
      pathId,
      componentLabel,
      signalKey: activeSignalComponent?.signalKey ?? null,
    },
    finalRegisters: currentRegisterValues,
    finalMemoryWords: toMemoryWordRecord(currentMemoryWords),
    finalPipeline: pipeline,
    finalPipelineInstructionIndices: pipelineInstructionIndices,
    finalPipelineEffects: pipelineEffects,
    nextInstructionIndex,
  };
  return {
    ...stepLimitResult,
    ...buildAssertions(expected, stepLimitResult),
  };
}
