import { Panel } from "@/ui/components";
import { MIPS_5_STAGE_BASE } from "@/core/pipeline/templates/mips5Stage.template";
import { DiagramDebugView } from "./DiagramDebugView";

export default function PipelineCanvas() {
  return (
    <Panel title="Pipeline Diagram" headerSize="xl">
      <DiagramDebugView template={MIPS_5_STAGE_BASE} />
    </Panel>
  );
}