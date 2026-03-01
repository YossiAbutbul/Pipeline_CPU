import { useMemo, useState } from "react";
import type { DiagramNode, DiagramTemplate, Port } from "@/core/pipeline/diagramTypes";
import { getDiagramBounds } from "@/core/pipeline/diagramBounds";
import { getPortPosition } from "@/core/pipeline/portGeometry";
import styles from "./diagramSvgView.module.css";

type Props = {
  template: DiagramTemplate;
};

export function DiagramSvgView({ template }: Props) {
  const b = getDiagramBounds(template);

  const pad = 40;
  const viewBox = [
    b.minX - pad,
    b.minY - pad,
    b.width + pad * 2,
    b.height + pad * 2,
  ].join(" ");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodeById = useMemo(() => {
    const m = new Map<string, DiagramNode>();
    for (const n of template.nodes) m.set(n.id, n);
    return m;
  }, [template.nodes]);

  // TEMP: mocked “active edges” (Step E will drive this from simulation/cycle)
  const activeEdgeIds = useMemo(() => new Set<string>(["e_imem_to_ifid"]), []);

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

        {/* Edges under nodes */}
        <g className={styles.layerEdges}>
          {template.edges.map((e) => {
            const fromNode = nodeById.get(e.from.nodeId);
            const toNode = nodeById.get(e.to.nodeId);
            if (!fromNode || !toNode) return null;

            const fromPort = findPort(fromNode, e.from.portId);
            const toPort = findPort(toNode, e.to.portId);
            if (!fromPort || !toPort) return null;

            const p1 = getPortPosition(fromNode, fromPort);
            const p2 = getPortPosition(toNode, toPort);
            const d = orthogonalPath(p1.x, p1.y, p2.x, p2.y);

            return (
              <path
                key={e.id}
                className={styles.edge}
                d={d}
                data-layer={e.layer}
                data-active={activeEdgeIds.has(e.id) ? "true" : "false"}
              />
            );
          })}
        </g>

        {/* Nodes */}
        <g className={styles.layerNodes}>
          {pipelineRegs.map((n) => (
            <PipelineReg key={n.id} node={n} selected={selectedNodeId === n.id} onSelect={setSelectedNodeId} />
          ))}
          {blocks.map((n) => (
            <RectNode key={n.id} node={n} selected={selectedNodeId === n.id} onSelect={setSelectedNodeId} />
          ))}
          {muxes.map((n) => (
            <RectNode key={n.id} node={n} selected={selectedNodeId === n.id} onSelect={setSelectedNodeId} />
          ))}
          {units.map((n) => (
            <RectNode key={n.id} node={n} selected={selectedNodeId === n.id} onSelect={setSelectedNodeId} />
          ))}
        </g>
      </svg>
    </div>
  );
}

function findPort(node: DiagramNode, portId: string): Port | undefined {
  const ins = node.ports?.in ?? [];
  const outs = node.ports?.out ?? [];
  return [...ins, ...outs].find((p) => p.id === portId);
}

// Simple orthogonal “dogleg” path (deterministic, easy to style)
function orthogonalPath(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

function StageBand({ node }: { node: DiagramNode }) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

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

function PipelineReg({
  node,
  selected,
  onSelect,
}: {
  node: DiagramNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  return (
    <g className={styles.nodeGroup} data-selected={selected ? "true" : "false"} onClick={() => onSelect(node.id)}>
      <rect className={styles.pipelineReg} x={x} y={y} width={w} height={h} rx={10} />
      <text className={styles.pipelineRegLabel} x={x + w / 2} y={y - 10} textAnchor="middle">
        {node.label}
      </text>
    </g>
  );
}

function RectNode({
  node,
  selected,
  onSelect,
}: {
  node: DiagramNode;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  const lines = node.label.split("\n");
  const lineHeight = 16;
  const startDy = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g className={styles.nodeGroup} data-selected={selected ? "true" : "false"} onClick={() => onSelect(node.id)}>
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