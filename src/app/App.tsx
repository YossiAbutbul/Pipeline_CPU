import { useMemo, useState } from "react";
import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import ProgramEditor from "@/features/program/ProgramEditor";
import StatePanel from "@/features/statePanels/StatePanel";
import { compileAndLog } from "@/features/compiler";
import "./app.css";

const DEFAULT_PROGRAM = "# Write MIPS here...\nadd $1, $2, $3\n";
const DEFAULT_INITIAL_PC = "0x00400000";
const PIPELINE_STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;

type StageName = (typeof PIPELINE_STAGES)[number];
type PipelineSlots = Record<StageName, string | null>;
type PipelineSnapshot = {
  pipeline: PipelineSlots;
  nextInstructionIndex: number;
};

const EMPTY_PIPELINE: PipelineSlots = {
  IF: null,
  ID: null,
  EX: null,
  MEM: null,
  WB: null,
};

function parseInstructions(program: string) {
  return program
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function parseInitialPc(raw: string): number {
  const value = raw.trim();
  if (!value) {
    throw new Error("Initial PC is required");
  }

  const numeric = value.toLowerCase().startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  if (!Number.isInteger(numeric)) {
    throw new Error("Initial PC must be a valid integer (e.g. 0x00400000)");
  }
  if (numeric < 0 || numeric > 0xffff_ffff) {
    throw new Error("Initial PC must be within 32-bit unsigned range");
  }
  if (numeric % 4 !== 0) {
    throw new Error("Initial PC must be word-aligned (multiple of 4)");
  }

  return numeric >>> 0;
}

export default function App() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const [initialPc, setInitialPc] = useState(DEFAULT_INITIAL_PC);
  const [pipeline, setPipeline] = useState<PipelineSlots>(EMPTY_PIPELINE);
  const [nextInstructionIndex, setNextInstructionIndex] = useState(0);
  const [history, setHistory] = useState<PipelineSnapshot[]>([]);
  const [runSessionActive, setRunSessionActive] = useState(false);

  const instructions = useMemo(() => parseInstructions(program), [program]);
  const hasInstructionsToInject = nextInstructionIndex < instructions.length;
  const hasPipelineWork = Object.values(pipeline).some((value) => value !== null);
  const canStepForward = runSessionActive && (hasInstructionsToInject || hasPipelineWork);
  const canStepBackward = runSessionActive && history.length > 0;

  const handleProgramChange = (nextProgram: string) => {
    setProgram(nextProgram);
    setPipeline(EMPTY_PIPELINE);
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(false);
  };

  const handleInitialPcChange = (value: string) => {
    setInitialPc(value);
    setPipeline(EMPTY_PIPELINE);
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(false);
  };

  const handleRun = () => {
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
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(true);
  };

  const handleStep = () => {
    if (!canStepForward) {
      return;
    }

    const incomingInstruction = instructions[nextInstructionIndex] ?? null;
    const currentSnapshot: PipelineSnapshot = {
      pipeline,
      nextInstructionIndex,
    };

    setHistory((prev) => [...prev, currentSnapshot]);

    setPipeline((prev) => ({
      IF: incomingInstruction,
      ID: prev.IF,
      EX: prev.ID,
      MEM: prev.EX,
      WB: prev.MEM,
    }));

    if (incomingInstruction) {
      setNextInstructionIndex((idx) => idx + 1);
    }
  };

  const handleStepBack = () => {
    setHistory((prev) => {
      const previous = prev[prev.length - 1];
      if (!previous) {
        return prev;
      }

      setPipeline(previous.pipeline);
      setNextInstructionIndex(previous.nextInstructionIndex);
      return prev.slice(0, -1);
    });
  };

  const handleResetPipeline = () => {
    setPipeline(EMPTY_PIPELINE);
    setNextInstructionIndex(0);
    setHistory([]);
    setRunSessionActive(false);
  };

  return (
    <div className="appShell">
      <aside className="leftPane">
        <ProgramEditor
          program={program}
          onProgramChange={handleProgramChange}
          onReset={handleResetPipeline}
          onRun={handleRun}
          initialPc={initialPc}
          onInitialPcChange={handleInitialPcChange}
        />
      </aside>

      <main className="centerPane">
        <PipelineCanvas
          pipeline={pipeline}
          onStepForward={handleStep}
          onStepBackward={handleStepBack}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
        />
      </main>

      <aside className="rightPane">
        <StatePanel />
      </aside>
    </div>
  );
}
