import type { DiagramNode, DiagramTemplate } from "@/core/pipeline/diagramTypes";
import { getDiagramBounds } from "@/core/pipeline/diagramBounds";
import styles from "./diagramSvgView.module.css";

type Props = {
  template: DiagramTemplate;
};

export function DiagramSvgView({ template }: Props) {
  const b = getDiagramBounds(template);

  // Diagram padding in template coordinates (domain geometry, not style)
  const pad = 40;
  const viewBox = [
    b.minX - pad,
    b.minY - pad,
    b.width + pad * 2,
    b.height + pad * 2,
  ].join(" ");

  const stages = template.nodes.filter((n) => n.kind === "stage");
  const pipelineRegs = template.nodes.filter((n) => n.kind === "pipeline_reg");
  const blocks = template.nodes.filter((n) => n.kind === "block");
  const muxes = template.nodes.filter((n) => n.kind === "mux");
  const units = template.nodes.filter((n) => n.kind === "unit");

  return (
    <div className={styles.root}>
      <svg className={styles.svg} viewBox={viewBox} role="img" aria-label={template.name}>
        <g className={styles.layerStages}>
          {stages.map((n) => (
            <StageBand key={n.id} node={n} />
          ))}
        </g>

        <g className={styles.layerNodes}>
          {pipelineRegs.map((n) => (
            <PipelineReg key={n.id} node={n} />
          ))}
          {blocks.map((n) => (
            <RectNode key={n.id} node={n} />
          ))}
          {muxes.map((n) => (
            <RectNode key={n.id} node={n} />
          ))}
          {units.map((n) => (
            <RectNode key={n.id} node={n} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function StageBand({ node }: { node: DiagramNode }) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  // small inset for label readability (geometry)
  const insetX = 14;
  const insetY = 26;

  return (
    <g>
      <rect className={styles.stageBand} x={x} y={y} width={w} height={h} rx={12} />
      <text className={styles.stageLabel} x={x + insetX} y={y + insetY}>
        {node.label}
      </text>
    </g>
  );
}

function PipelineReg({ node }: { node: DiagramNode }) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  return (
    <g>
      <rect className={styles.pipelineReg} x={x} y={y} width={w} height={h} rx={10} />
      <text className={styles.pipelineRegLabel} x={x + w / 2} y={y - 10} textAnchor="middle">
        {node.label}
      </text>
    </g>
  );
}

function RectNode({ node }: { node: DiagramNode }) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  const lines = node.label.split("\n");
  const lineHeight = 16; // geometry baseline spacing for SVG tspans

  // center the block text vertically
  const startDy = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g>
      <rect className={styles.block} x={x} y={y} width={w} height={h} rx={12} />
      <text className={styles.blockLabel} x={x + w / 2} y={y + h / 2} textAnchor="middle">
        {lines.map((line, i) => (
          <tspan key={i} x={x + w / 2} dy={i === 0 ? startDy : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}