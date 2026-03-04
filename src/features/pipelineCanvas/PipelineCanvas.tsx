import { Panel } from "@/ui/components";
import CpuDiagram from "@/assets/cpu/mips_cpu.svg?react";

export default function PipelineCanvas() {
  return (
    <Panel title="Pipeline Diagram" headerSize="xl">
      <div style={{ width: "100%", overflow: "auto" }}>
        <CpuDiagram style={{ width: "100%", height: "auto" }} />
      </div>
    </Panel>
  );
}