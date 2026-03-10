import { compileAndLog, compileProgram } from "@/features/compiler";
import { parseRegister } from "@/features/compiler/registers";
import { parseProgram } from "@/features/compiler/parser";
import { REG_INFO } from "@/monaco/mips/mipsData";
import { useMemo, useState } from "react";
import type { MemoryRuleConfig } from "@/app/store/appStore";
import { parseRegisterValue, toHex32 } from "@/features/statePanels/registerEditorModel";
import { createMemoryFromRules } from "../runtime/memoryRuntime";
import { parseImmediate, parseInitialPc } from "../core/parse";
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

export type PipelineSignalValues = Partial<
  Record<
    | "pc"
    | "pcPlus4"
    | "constant4"
    | "instructionWord"
    | "rsValue"
    | "rtValue"
    | "imm16Value"
    | "signExtendedImmValue"
    | "aluInputA"
    | "aluInputB"
    | "aluResult",
    string
  >
>;

const REGISTER_ALIAS_BY_NUMBER = Object.entries(REG_INFO).reduce<Record<number, string>>((acc, [alias, info]) => {
  acc[info.num] = alias;
  return acc;
}, {});

function parseMemoryBaseRegister(operand: string): number | null {
  const match = operand.trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
  if (!match) {
    return null;
  }
  return parseRegister(match[2].trim());
}

function getIdReadRegisterNumbers(instruction: { mnemonic: string; operands: string[] } | null): [number | null, number | null] {
  if (!instruction) {
    return [null, null];
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), parseRegister(operands[2])];
    }
    if (["sllv", "srlv", "srav"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[2]), parseRegister(operands[1])];
    }
    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      return [null, parseRegister(operands[1])];
    }
    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      return [parseRegister(operands[1]), null];
    }
    if (mnemonic === "move" && operands.length === 2) {
      return [parseRegister(operands[1]), null];
    }
    if (["lw", "lb", "lbu", "lh", "lhu"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), null];
    }
    if (["sw", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      return [parseMemoryBaseRegister(operands[1]), parseRegister(operands[0])];
    }
    if ((mnemonic === "beq" || mnemonic === "bne") && operands.length === 3) {
      return [parseRegister(operands[0]), parseRegister(operands[1])];
    }
    if (["blez", "bgtz", "bltz", "bgez", "jr"].includes(mnemonic) && operands.length >= 1) {
      return [parseRegister(operands[0]), null];
    }
    if (mnemonic === "jalr") {
      if (operands.length === 1) {
        return [parseRegister(operands[0]), null];
      }
      if (operands.length === 2) {
        return [parseRegister(operands[1]), null];
      }
    }
    if (["mult", "multu", "div", "divu"].includes(mnemonic) && operands.length === 2) {
      return [parseRegister(operands[0]), parseRegister(operands[1])];
    }
    if (["mthi", "mtlo"].includes(mnemonic) && operands.length === 1) {
      return [parseRegister(operands[0]), null];
    }
  } catch {
    return [null, null];
  }

  return [null, null];
}

function getRegisterHexValue(values: Record<string, string>, registerNumber: number | null): string | undefined {
  if (registerNumber === null) {
    return undefined;
  }

  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return undefined;
  }

  try {
    return toHex32(parseRegisterValue(values[alias] ?? "0"));
  } catch {
    return undefined;
  }
}

function getIdImmediateValues(instruction: { mnemonic: string; operands: string[] } | null): {
  imm16Value?: string;
  signExtendedImmValue?: string;
} {
  if (!instruction) {
    return {};
  }

  const { mnemonic, operands } = instruction;

  try {
    let immediate: number | null = null;

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      immediate = parseImmediate(operands[2]);
    } else if (mnemonic === "lui" && operands.length === 2) {
      immediate = parseImmediate(operands[1]);
    } else if (["lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      const match = operands[1].trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
      immediate = match ? parseImmediate(match[1]) : null;
    } else if (["beq", "bne"].includes(mnemonic) && operands.length === 3) {
      immediate = parseImmediate(operands[2]);
    } else if (["blez", "bgtz", "bltz", "bgez"].includes(mnemonic) && operands.length >= 2) {
      immediate = parseImmediate(operands[1]);
    } else if (mnemonic === "li" && operands.length === 2) {
      immediate = parseImmediate(operands[1]);
    }

    if (immediate === null) {
      return {};
    }

    const imm16 = immediate & 0xffff;
    const signExtended = ((imm16 << 16) >> 16) >>> 0;

    return {
      imm16Value: toHex32(imm16),
      signExtendedImmValue: toHex32(signExtended),
    };
  } catch {
    return {};
  }
}

function getRegisterNumericValue(values: Record<string, string>, registerNumber: number | null): number | null {
  if (registerNumber === null) {
    return null;
  }

  const alias = REGISTER_ALIAS_BY_NUMBER[registerNumber];
  if (!alias) {
    return null;
  }

  try {
    return parseRegisterValue(values[alias] ?? "0");
  } catch {
    return null;
  }
}

function getExSignalValues(
  instruction: { mnemonic: string; operands: string[] } | null,
  values: Record<string, string>,
): {
  aluInputA?: string;
  aluInputB?: string;
  aluResult?: string;
} {
  if (!instruction) {
    return {};
  }

  const { mnemonic, operands } = instruction;

  try {
    if (["add", "addu", "sub", "subu", "and", "or", "xor", "nor", "slt", "sltu"].includes(mnemonic) && operands.length === 3) {
      const a = getRegisterNumericValue(values, parseRegister(operands[1]));
      const b = getRegisterNumericValue(values, parseRegister(operands[2]));
      if (a === null || b === null) {
        return {};
      }
      const result =
        mnemonic === "add" || mnemonic === "addu"
          ? (a + b) >>> 0
          : mnemonic === "sub" || mnemonic === "subu"
            ? (a - b) >>> 0
            : mnemonic === "and"
              ? a & b
              : mnemonic === "or"
                ? a | b
                : mnemonic === "xor"
                  ? a ^ b
                  : mnemonic === "nor"
                    ? (~(a | b)) >>> 0
                    : mnemonic === "slt"
                      ? (a >> 0) < (b >> 0)
                        ? 1
                        : 0
                      : a < b
                        ? 1
                        : 0;

      return { aluInputA: toHex32(a), aluInputB: toHex32(b), aluResult: toHex32(result) };
    }

    if (["addi", "addiu", "andi", "ori", "xori", "slti", "sltiu"].includes(mnemonic) && operands.length === 3) {
      const a = getRegisterNumericValue(values, parseRegister(operands[1]));
      const imm = parseImmediate(operands[2]);
      if (a === null) {
        return {};
      }
      const signExtendedImm = ((imm & 0xffff) << 16 >> 16) >>> 0;
      const zeroExtendedImm = imm & 0xffff;
      const b = ["andi", "ori", "xori", "sltiu"].includes(mnemonic) ? zeroExtendedImm >>> 0 : signExtendedImm;
      const result =
        mnemonic === "addi" || mnemonic === "addiu"
          ? (a + signExtendedImm) >>> 0
          : mnemonic === "andi"
            ? a & zeroExtendedImm
            : mnemonic === "ori"
              ? a | zeroExtendedImm
              : mnemonic === "xori"
                ? a ^ zeroExtendedImm
                : mnemonic === "slti"
                  ? (a >> 0) < (signExtendedImm >> 0)
                    ? 1
                    : 0
                  : a < (zeroExtendedImm >>> 0)
                    ? 1
                    : 0;

      return { aluInputA: toHex32(a), aluInputB: toHex32(b), aluResult: toHex32(result) };
    }

    if (["lw", "sw", "lb", "lbu", "lh", "lhu", "sb", "sh"].includes(mnemonic) && operands.length === 2) {
      const match = operands[1].trim().match(/^([-+]?0x[0-9a-fA-F]+|[-+]?\d+)\(([^)]+)\)$/);
      if (!match) {
        return {};
      }
      const offset = parseImmediate(match[1]);
      const base = getRegisterNumericValue(values, parseRegister(match[2].trim()));
      if (base === null) {
        return {};
      }
      const signExtendedOffset = ((offset & 0xffff) << 16 >> 16) >>> 0;
      const address = (base + signExtendedOffset) >>> 0;
      return { aluInputA: toHex32(base), aluInputB: toHex32(signExtendedOffset), aluResult: toHex32(address) };
    }

    if (["sll", "srl", "sra"].includes(mnemonic) && operands.length === 3) {
      const rt = getRegisterNumericValue(values, parseRegister(operands[1]));
      const shamt = parseImmediate(operands[2]) & 0x1f;
      if (rt === null) {
        return {};
      }
      const result = mnemonic === "sll" ? (rt << shamt) >>> 0 : mnemonic === "srl" ? rt >>> shamt : (rt >> shamt) >>> 0;
      return { aluInputA: toHex32(rt), aluInputB: toHex32(shamt), aluResult: toHex32(result) };
    }
  } catch {
    return {};
  }

  return {};
}

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
    const ifInstructionIndex = pipelineInstructionIndices.IF;
    const idInstructionIndex = pipelineInstructionIndices.ID;
    const exInstructionIndex = pipelineInstructionIndices.EX;
    const ifInstruction = ifInstructionIndex === null ? null : instructions[ifInstructionIndex];
    const idInstruction = idInstructionIndex === null ? null : instructions[idInstructionIndex];
    const exInstruction = exInstructionIndex === null ? null : instructions[exInstructionIndex];
    const [rsNumber, rtNumber] = getIdReadRegisterNumbers(idInstruction);
    const immediateValues = getIdImmediateValues(idInstruction);
    const exSignalValues = getExSignalValues(exInstruction, registerValues);

    return {
      pc: ifInstruction ? `0x${(ifInstruction.pc >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
      pcPlus4: ifInstruction ? `0x${(((ifInstruction.pc >>> 0) + 4) >>> 0).toString(16).toUpperCase().padStart(8, "0")}` : undefined,
      constant4: ifInstruction ? "0x00000004" : undefined,
      instructionWord: ifInstruction ? encodedInstructionHexByPc[ifInstruction.pc >>> 0] : undefined,
      rsValue: getRegisterHexValue(registerValues, rsNumber),
      rtValue: getRegisterHexValue(registerValues, rtNumber),
      imm16Value: immediateValues.imm16Value,
      signExtendedImmValue: immediateValues.signExtendedImmValue,
      aluInputA: exSignalValues.aluInputA,
      aluInputB: exSignalValues.aluInputB,
      aluResult: exSignalValues.aluResult,
    };
  }, [encodedInstructionHexByPc, instructions, pipelineInstructionIndices.EX, pipelineInstructionIndices.ID, pipelineInstructionIndices.IF, registerValues]);

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
