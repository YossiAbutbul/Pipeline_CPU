import { useEffect, useMemo, useRef, useState } from "react";
import type { DiagramNode, DiagramTemplate, Port } from "@/core/pipeline/diagramTypes";
import { getDiagramBounds } from "@/core/pipeline/diagramBounds";
import { getPortPosition } from "@/core/pipeline/portGeometry";
import styles from "./diagramSvgView.module.css";

type Props = {
  template: DiagramTemplate;
};

type Viewport = {
  scale: number;
  tx: number;
  ty: number;
};

export function DiagramSvgView({ template }: Props) {
  const bounds = getDiagramBounds(template);

  // Diagram padding in template coordinates (fixed)
  const pad = 60;
  const diagram = useMemo(() => {
    const x = bounds.minX - pad;
    const y = bounds.minY - pad;
    const w = bounds.width + pad * 2;
    const h = bounds.height + pad * 2;
    return { x, y, w, h };
  }, [bounds.minX, bounds.minY, bounds.width, bounds.height]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [vp, setVp] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Fit on mount + whenever the container size changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const fit = () => {
      const rect = svg.getBoundingClientRect();
      const vw = rect.width;
      const vh = rect.height;
      if (vw <= 0 || vh <= 0) return;

      const inset = 16;
      const sx = (vw - inset * 2) / diagram.w;
      const sy = (vh - inset * 2) / diagram.h;
      const scale = Math.min(sx, sy);

      const cx = diagram.x + diagram.w / 2;
      const cy = diagram.y + diagram.h / 2;
      const tx = vw / 2 - cx * scale;
      const ty = vh / 2 - cy * scale;

      setVp({ scale, tx, ty });
    };

    fit();

    const ro = new ResizeObserver(() => fit());
    ro.observe(svg);

    return () => ro.disconnect();
  }, [diagram.x, diagram.y, diagram.w, diagram.h]);

  // Pan state
  const panRef = useRef<{ active: boolean; x: number; y: number; tx: number; ty: number }>({
    active: false,
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
  });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // ✅ Pan only with middle mouse button
    if (e.button !== 1) return;

    // ✅ Prevent browser auto-scroll behavior
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    svg.setPointerCapture(e.pointerId);
    setIsPanning(true);

    panRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      tx: vp.tx,
      ty: vp.ty,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    const dx = e.clientX - panRef.current.x;
    const dy = e.clientY - panRef.current.y;
    setVp((prev) => ({ ...prev, tx: panRef.current.tx + dx, ty: panRef.current.ty + dy }));
  };

  const endPan = (pointerId?: number) => {
    panRef.current.active = false;
    setIsPanning(false);

    const svg = svgRef.current;
    if (!svg || pointerId == null) return;

    try {
      svg.releasePointerCapture(pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    endPan(e.pointerId);
  };

  const onPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    endPan(e.pointerId);
  };

  // Wheel zoom around cursor
  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);

    setVp((prev) => {
      const nextScale = clamp(prev.scale * zoomFactor, 0.2, 4);

      const wx = (mx - prev.tx) / prev.scale;
      const wy = (my - prev.ty) / prev.scale;

      const tx = mx - wx * nextScale;
      const ty = my - wy * nextScale;

      return { scale: nextScale, tx, ty };
    });
  };

  const nodeById = useMemo(() => {
    const m = new Map<string, DiagramNode>();
    for (const n of template.nodes) m.set(n.id, n);
    return m;
  }, [template.nodes]);

  const activeEdgeIds = useMemo(() => new Set<string>(["e_imem_to_ifid"]), []);
  const stages = template.nodes.filter((n) => n.kind === "stage");
  const pipelineRegs = template.nodes.filter((n) => n.kind === "pipeline_reg");
  const blocks = template.nodes.filter((n) => n.kind === "block");
  const muxes = template.nodes.filter((n) => n.kind === "mux");
  const units = template.nodes.filter((n) => n.kind === "unit");

  return (
    <div className={styles.root}>
      <svg
        ref={svgRef}
        className={styles.svg}
        data-panning={isPanning ? "true" : "false"}
        role="img"
        aria-label={template.name}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
      >
        <rect className={styles.canvasBg} x={0} y={0} width="100%" height="100%" />

        <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`}>
          <g className={styles.layerStages}>
            {stages.map((n) => (
              <StageBand key={n.id} node={n} />
            ))}
          </g>

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
        </g>
      </svg>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function findPort(node: DiagramNode, portId: string): Port | undefined {
  const ins = node.ports?.in ?? [];
  const outs = node.ports?.out ?? [];
  return [...ins, ...outs].find((p) => p.id === portId);
}

function orthogonalPath(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}

function StageBand({ node }: { node: DiagramNode }) {
  const { x, y } = node.layout.position;
  const { w, h } = node.layout.size;

  return (
    <g>
      <rect className={styles.stageBand} x={x} y={y} width={w} height={h} rx={12} />
      <text className={styles.stageLabel} x={x + 14} y={y + 26}>
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
  const lineHeight = 16;
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