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
import { buildPipelineSignalValues, type PipelineSignalValues } from "../signals/pipelineSignals";
import { stepPipelineForward } from "../stages/pipelineStep";

type ComponentPathTestInput = {
  program: string;
  pathId: string;
  componentLabel: string;
  initialPc?: string;
  maxSteps?: number;
  registerValues?: Record<string, string>;
  memoryRules?: MemoryRuleConfig[];
  initialMemoryWords?: Record<string, string | number>;
  expected?: {
    status?: "completed" | "step_limit";
    maxSteps?: number;
    registers?: Record<string, string>;
    memoryWords?: Record<string, string>;
  };
};

type NamedComponentPathTestInput = ComponentPathTestInput & {
  name: string;
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

type ComponentPathTraceStep = {
  cycle: number;
  pipeline: PipelineSlots;
  pipelineInstructionIndices: PipelineInstructionSlots;
  pipelineEffects: PipelineEffectSlots;
  nextInstructionIndex: number;
  registers: Record<string, string>;
  memoryWords: Record<string, string>;
  hoveredSignalValues: PipelineSignalValues;
};

type ComponentPathTraceResult = {
  component: {
    pathId: string;
    componentLabel: string;
    signalKey: string | null;
  };
  steps: ComponentPathTraceStep[];
};

type BaseComponentPathTestResult = Omit<ComponentPathTestResult, "expected" | "pass" | "mismatches">;

type ComponentPathSuiteResult = {
  pass: boolean;
  summary: {
    suiteName: string;
    passed: number;
    failed: number;
    total: number;
  };
  results: Array<
    ComponentPathTestResult & {
      name: string;
    }
  >;
};

const BRANCH_PROGRAM = `
addi $t0, $zero, 0
beq  $t0, $zero, skip
addi $t1, $zero, 9
skip:
addi $t2, $zero, 7
`;

const WRITEBACK_PROGRAM = `
addi $t0, $zero, 5
addi $t1, $zero, 1
`;

const MEMORY_WRITE_PROGRAM = `sw   $t0, 0($zero)`;
const MEMORY_READ_PROGRAM = `lw   $t1, 0($zero)`;

const EX_A_PROGRAM = `add $t1, $t0, $zero`;
const EX_B_PROGRAM = `add $t1, $zero, $t0`;
const IMMEDIATE_PROGRAM = `addi $t0, $zero, 5`;

function createBranchSuiteCases(): NamedComponentPathTestInput[] {
  return [
    {
      name: "Branch Base Path",
      pathId: "w_ifid_to_adder_branch_id",
      componentLabel: "NOT",
      maxSteps: 20,
      program: BRANCH_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000000",
          t1: "0x00000009",
          t2: "0x00000007",
        },
      },
    },
    {
      name: "Branch Offset Before Shift",
      pathId: "w_32bit_imm_to_shiftleft2_id",
      componentLabel: "NOT",
      maxSteps: 20,
      program: BRANCH_PROGRAM,
      expected: {
        status: "step_limit",
        registers: {
          t0: "0x00000000",
        },
      },
    },
    {
      name: "Branch Shifted Offset",
      pathId: "w_shiftleft2_id_to_adder_branch_id",
      componentLabel: "NOT",
      maxSteps: 20,
      program: BRANCH_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000000",
          t1: "0x00000009",
          t2: "0x00000007",
        },
      },
    },
    {
      name: "Branch Target",
      pathId: "w_adder_branch_id_to_mux_pcsrc",
      componentLabel: "NOT",
      maxSteps: 20,
      program: BRANCH_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000000",
          t1: "0x00000009",
          t2: "0x00000007",
        },
      },
    },
    {
      name: "Selected Next PC",
      pathId: "w_mux_pcsrc_to_pc",
      componentLabel: "NOT",
      maxSteps: 20,
      program: BRANCH_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000000",
          t1: "0x00000000",
          t2: "0x00000000",
        },
      },
    },
  ];
}

function createWritebackSuiteCases(): NamedComponentPathTestInput[] {
  return [
    {
      name: "Writeback Value",
      pathId: "w_mem_to_regfile",
      componentLabel: "NOT",
      program: WRITEBACK_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0xFFFFFFFA",
          t1: "0xFFFFFFFE",
        },
      },
    },
    {
      name: "ALU Result To WB",
      pathId: "w_alu_out_to_exmem",
      componentLabel: "NOT",
      program: IMMEDIATE_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0xFFFFFFFA",
        },
      },
    },
  ];
}

function createMemorySuiteCases(): NamedComponentPathTestInput[] {
  return [
    {
      name: "Memory Write Data",
      pathId: "w_mux_fwd_b_to_exmem",
      componentLabel: "NOT",
      registerValues: { t0: "0x00000005" },
      program: MEMORY_WRITE_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000005",
        },
        memoryWords: {
          "0": "0xFFFFFFFA",
        },
      },
    },
    {
      name: "Memory Read Data",
      pathId: "w_dmem_readdata_to_mux_memtoreg",
      componentLabel: "NOT",
      initialMemoryWords: { 0: "0x00000005" },
      program: MEMORY_READ_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000000",
          t1: "0xFFFFFFFA",
        },
        memoryWords: {
          "0": "0x00000005",
        },
      },
    },
  ];
}

function createExInputSuiteCases(): NamedComponentPathTestInput[] {
  return [
    {
      name: "EX Source A",
      pathId: "w_idex_rs3_to_mux_fwd_a",
      componentLabel: "NOT",
      registerValues: { t0: "0x00000005" },
      program: EX_A_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000005",
          t1: "0xFFFFFFFA",
        },
      },
    },
    {
      name: "ALU Input A",
      pathId: "w_mux_fwd_a_rs_to_alu_a",
      componentLabel: "NOT",
      registerValues: { t0: "0x00000005" },
      program: EX_A_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000005",
          t1: "0xFFFFFFFA",
        },
      },
    },
    {
      name: "EX Source B",
      pathId: "w_idex_rt3_to_mux_fwd_b",
      componentLabel: "NOT",
      registerValues: { t0: "0x00000005" },
      program: EX_B_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000005",
          t1: "0xFFFFFFFA",
        },
      },
    },
    {
      name: "ALU Input B",
      pathId: "w_mux_alusrc_to_alu_b",
      componentLabel: "NOT",
      registerValues: { t0: "0x00000005" },
      program: EX_B_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0x00000005",
          t1: "0xFFFFFFFA",
        },
      },
    },
    {
      name: "EX Immediate",
      pathId: "w_idex_32bit_imm_to_mux_alusrc",
      componentLabel: "NOT",
      program: IMMEDIATE_PROGRAM,
      expected: {
        status: "completed",
        registers: {
          t0: "0xFFFFFFFA",
        },
      },
    },
  ];
}

function toMemoryWordRecord(memoryWords: Map<number, number>) {
  return Array.from(memoryWords.entries())
    .sort((a, b) => a[0] - b[0])
    .reduce<Record<string, string>>((acc, [wordIndex, value]) => {
      acc[String(wordIndex)] = toHex32(value);
      return acc;
    }, {});
}

function buildEncodedInstructionHexByPc(program: string, initialPc: number) {
  const compiled = compileProgram(program, { initialPc });
  return compiled.encoded.reduce<Record<number, string>>((acc, instruction) => {
    acc[instruction.pc] = instruction.hex;
    return acc;
  }, {});
}

function hydrateInstructionMemory(
  memoryWords: Map<number, number>,
  encodedInstructionHexByPc: Record<number, string>,
) {
  const hydrated = new Map(memoryWords);

  Object.entries(encodedInstructionHexByPc).forEach(([pcKey, hex]) => {
    const pc = Number(pcKey);
    if (!Number.isInteger(pc) || pc < 0 || pc % 4 !== 0) {
      return;
    }

    const wordIndex = pc / 4;
    if (hydrated.has(wordIndex)) {
      return;
    }

    hydrated.set(wordIndex, Number.parseInt(hex, 16) >>> 0);
  });

  return hydrated;
}

function createInitialMemoryWords(
  memoryRules: MemoryRuleConfig[],
  initialMemoryWords: Record<string, string | number> | undefined,
  encodedInstructionHexByPc: Record<number, string>,
) {
  const memoryWords = createMemoryFromRules(memoryRules);

  Object.entries(initialMemoryWords ?? {}).forEach(([wordIndex, value]) => {
    const parsedWordIndex = Number(wordIndex);
    if (!Number.isInteger(parsedWordIndex) || parsedWordIndex < 0) {
      return;
    }

    const parsedValue =
      typeof value === "number"
        ? value >>> 0
        : value.trim().toLowerCase().startsWith("0x")
          ? Number.parseInt(value, 16) >>> 0
          : Number.parseInt(value, 10) >>> 0;

    memoryWords.set(parsedWordIndex, parsedValue);
  });

  return hydrateInstructionMemory(memoryWords, encodedInstructionHexByPc);
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

function runNamedCases(suiteName: string, cases: NamedComponentPathTestInput[]): ComponentPathSuiteResult {
  const results = cases.map(({ name, ...testCase }) => ({
    name,
    ...runComponentPathTest(testCase),
  }));
  const failed = results.filter((result) => result.pass === false).length;
  const passed = results.length - failed;

  return {
    pass: failed === 0,
    summary: {
      suiteName,
      passed,
      failed,
      total: results.length,
    },
    results,
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
  initialMemoryWords,
  expected,
}: ComponentPathTestInput): ComponentPathTestResult {
  const parsedInitialPc = parseInitialPc(initialPc);
  const parsedProgram = parseProgram(program, { initialPc: parsedInitialPc });
  const encodedInstructionHexByPc = buildEncodedInstructionHexByPc(program, parsedInitialPc);

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
  let currentMemoryWords = createInitialMemoryWords(memoryRules, initialMemoryWords, encodedInstructionHexByPc);
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

export function traceComponentPathScenario({
  program,
  pathId,
  componentLabel,
  initialPc = "0x00400000",
  maxSteps = 16,
  registerValues,
  memoryRules = [],
  initialMemoryWords,
}: Omit<ComponentPathTestInput, "expected">): ComponentPathTraceResult {
  const parsedInitialPc = parseInitialPc(initialPc);
  const parsedProgram = parseProgram(program, { initialPc: parsedInitialPc });
  const encodedInstructionHexByPc = buildEncodedInstructionHexByPc(program, parsedInitialPc);

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
  let currentMemoryWords = createInitialMemoryWords(memoryRules, initialMemoryWords, encodedInstructionHexByPc);
  const steps: ComponentPathTraceStep[] = [];

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

  for (let cycle = 0; cycle <= maxSteps; cycle += 1) {
    const hoveredSignalValues = buildPipelineSignalValues({
      instructions,
      pipelineInstructionIndices,
      pipelineEffects,
      encodedInstructionHexByPc,
      registerValues: currentRegisterValues,
      memoryWords: currentMemoryWords,
      labels: parsedProgram.labels,
      pcToInstructionIndex,
      activeSignalComponent,
    });

    steps.push({
      cycle,
      pipeline: { ...pipeline },
      pipelineInstructionIndices: { ...pipelineInstructionIndices },
      pipelineEffects: { ...pipelineEffects },
      nextInstructionIndex,
      registers: { ...currentRegisterValues },
      memoryWords: toMemoryWordRecord(currentMemoryWords),
      hoveredSignalValues,
    });

    const hasInstructionsToInject = nextInstructionIndex < instructions.length;
    const hasPipelineWork = Object.values(pipelineInstructionIndices).some((value) => value !== null);
    if (!hasInstructionsToInject && !hasPipelineWork) {
      break;
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
  }

  return {
    component: {
      pathId,
      componentLabel,
      signalKey: activeSignalComponent?.signalKey ?? null,
    },
    steps,
  };
}

export function runBranchSuite() {
  return runNamedCases("branchSuite", createBranchSuiteCases());
}

export function runWritebackSuite() {
  return runNamedCases("writebackSuite", createWritebackSuiteCases());
}

export function runMemorySuite() {
  return runNamedCases("memorySuite", createMemorySuiteCases());
}

export function runExInputSuite() {
  return runNamedCases("exInputSuite", createExInputSuiteCases());
}

export function runAllComponentPathSuites() {
  const suites = [
    runWritebackSuite(),
    runMemorySuite(),
    runExInputSuite(),
    runBranchSuite(),
  ];
  const failed = suites.filter((suite) => !suite.pass).length;
  const passed = suites.length - failed;

  return {
    pass: failed === 0,
    summary: {
      suiteName: "allComponentPathSuites",
      passed,
      failed,
      total: suites.length,
    },
    suites,
  };
}
