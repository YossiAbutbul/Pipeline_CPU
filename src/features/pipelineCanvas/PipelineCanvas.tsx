import { Button, Panel } from "@/ui/components";
import CpuDiagram from "@/assets/cpu/mips_cpu.svg?react";
import { Rewind , FastForward  } from "lucide-react";
import "./pipelineCanvas.css";

type PipelineSlots = {
  IF: string | null;
  ID: string | null;
  EX: string | null;
  MEM: string | null;
  WB: string | null;
};

type Props = {
  pipeline: PipelineSlots;
  onStepForward: () => void;
  onStepBackward: () => void;
  canStepBackward: boolean;
  canStepForward: boolean;
};

const STAGE_ORDER: Array<keyof PipelineSlots> = ["IF", "ID", "EX", "MEM", "WB"];

export default function PipelineCanvas({
  pipeline,
  onStepForward,
  onStepBackward,
  canStepBackward,
  canStepForward,
}: Props) {
  return (
    <Panel title="Pipeline Diagram" headerSize="xl">
      <div className="pipelineTracker" aria-label="Pipeline stage tracker">
        {STAGE_ORDER.map((stage) => {
          const instruction = pipeline[stage];
          return (
            <div key={stage} className={`pipelineStage ${instruction ? "isActive" : ""}`}>
              <div className="pipelineStageName">{stage}</div>
              <div className="pipelineStageInstruction">{instruction ?? "Unknown"}</div>
            </div>
          );
        })}
      </div>
      <div className="pipelineTrackerControls">
        <Button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="btn-iconOnly"
          aria-label="Step backward"
          title="Step backward"
        >
          <Rewind size={16} aria-hidden="true" />
        </Button>
        <Button
          variant="primary"
          onClick={onStepForward}
          disabled={!canStepForward}
          className="btn-iconOnly"
          aria-label="Step forward"
          title="Step forward"
        >
          <FastForward size={16} aria-hidden="true" />
        </Button>
      </div>

      <div style={{ width: "100%", overflow: "auto", display: "flex", justifyContent: "center" }}>
        <CpuDiagram style={{ width: "90%", height: "auto" }} />
      </div>
    </Panel>
  );
}
