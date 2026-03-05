import { useMemo, useState } from "react";
import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import ProgramEditor from "@/features/program/ProgramEditor";
import StatePanel from "@/features/statePanels/StatePanel";
import "./app.css";

const DEFAULT_PROGRAM = "# Write MIPS here...\nadd $1, $2, $3\n";
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

export default function App() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const [pipeline, setPipeline] = useState<PipelineSlots>(EMPTY_PIPELINE);
  const [nextInstructionIndex, setNextInstructionIndex] = useState(0);
  const [history, setHistory] = useState<PipelineSnapshot[]>([]);
  const canStepBackward = history.length > 0;

  const instructions = useMemo(() => parseInstructions(program), [program]);
  const hasInstructionsToInject = nextInstructionIndex < instructions.length;
  const hasPipelineWork = Object.values(pipeline).some((value) => value !== null);
  const canStepForward = hasInstructionsToInject || hasPipelineWork;

  const handleProgramChange = (nextProgram: string) => {
    setProgram(nextProgram);
    setPipeline(EMPTY_PIPELINE);
    setNextInstructionIndex(0);
    setHistory([]);
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
  };

  return (
    <div className="appShell">
      <aside className="leftPane">
        <ProgramEditor
          program={program}
          onProgramChange={handleProgramChange}
          onReset={handleResetPipeline}
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
