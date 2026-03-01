import { Panel } from "@/ui/components";
import { MIPS_5_STAGE_BASE } from "@/core/pipeline/templates/mips5Stage.template";
import { DiagramSvgView } from "./DiagramSvgView";

export default function PipelineCanvas() {
  return (
    <Panel title="Pipeline Diagram" headerSize="xl">
      <DiagramSvgView template={MIPS_5_STAGE_BASE} />
    </Panel>
  );
}