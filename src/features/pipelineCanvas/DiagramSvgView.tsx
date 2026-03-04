import { useEffect, useMemo, useRef, useState } from "react";
import type { DiagramNode, DiagramTemplate, Port } from "@/core/pipeline/diagramTypes";
import { getDiagramBounds } from "@/core/pipeline/diagramBounds";
import { getPortPosition } from "@/core/pipeline/portGeometry";
import styles from "./diagramSvgView.module.css";
import { routeEdge } from "@/core/pipeline/routing/routeEdge";

type Props = {
  template: DiagramTemplate;
};

type Viewport = {
  scale: number;
  tx: number;
  ty: number;
};

type LayerState = {
  data: boolean;
  control: boolean;
  forwarding: boolean;
};

type LayoutVars = {
    pad: number;
    inset: number;
    lead: number;
    zoomMin: number;
    zoomMax: number;
    labelLine: number;
  };

function readCssNumber(el: Element, name: string, fallback: number) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const v = Number.parseFloat(raw);
  return Number.isFinite(v) ? v : fallback;
}

export function DiagramSvgView({ template }: Props) {
  const bounds = getDiagramBounds(template);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [layoutVars, setLayoutVars] = useState<LayoutVars>({
    pad: 60,
    inset: 16,
    lead: 18,
    zoomMin: 0.2,
    zoomMax: 4,
    labelLine: 16,
  });

  // Diagram padding in template coordinates (fixed)
  const diagram = useMemo(() => {
    const pad = layoutVars.pad;
    const x = bounds.minX - pad;
    const y = bounds.minY - pad;
    const w = bounds.width + pad * 2;
    const h = bounds.height + pad * 2;
    return { x, y, w, h };
  }, [bounds.minX, bounds.minY, bounds.width, bounds.height]);

  const [vp, setVp] = useState<Viewport>({ scale: 1, tx: 0, ty: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // NEW: layer toggles (data/control/forwarding)
  const [visibleLayers, setVisibleLayers] = useState<LayerState>({
    data: true,
    control: true,
    forwarding: true,
  });

  const toggleLayer = (layer: keyof LayerState) => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Fit on mount + whenever the container size changes
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const fit = () => {
      const rect = svg.getBoundingClientRect();
      const vw = rect.width;
      const vh = rect.height;
      if (vw <= 0 || vh <= 0) return;

      const rootEl = svg.closest(`.${styles.root}`) ?? svg;
      const pad = readCssNumber(rootEl, "--pcv-diagram-pad", 60);
      const inset = readCssNumber(rootEl, "--pcv-fit-inset", 16);
      const lead = readCssNumber(rootEl, "--pcv-route-lead", 18);
      const zoomMin = readCssNumber(rootEl, "--pcv-zoom-min", 0.2);
      const zoomMax = readCssNumber(rootEl, "--pcv-zoom-max", 4);
      const labelLine = readCssNumber(rootEl, "--pcv-label-line", 16);

  setLayoutVars((prev) => {
    if (
      prev.pad === pad &&
      prev.inset === inset &&
      prev.lead === lead &&
      prev.zoomMin === zoomMin &&
      prev.zoomMax === zoomMax &&
      prev.labelLine === labelLine
    ) {
      return prev;
    }
    return { pad, inset, lead, zoomMin, zoomMax, labelLine };
  });

      // Fit diagram rect into viewport with a little inset
      const sx = (vw - inset * 2) / diagram.w;
      const sy = (vh - inset * 2) / diagram.h;
      const scale = Math.min(sx, sy);

      // Center diagram
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

  // Middle mouse only (scroll click)
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 1) return;

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
      const nextScale = clamp(prev.scale * zoomFactor, layoutVars.zoomMin, layoutVars.zoomMax);

      // Keep the point under cursor stable:
      // screen = world*scale + t  => world = (screen - t)/scale
      const wx = (mx - prev.tx) / prev.scale;
      const wy = (my - prev.ty) / prev.scale;

      const tx = mx - wx * nextScale;
      const ty = my - wy * nextScale;

      return { scale: nextScale, tx, ty };
    });
  };

  // --- Existing helpers you already have ---
  const nodeById = useMemo(() => {
    const m = new Map<string, DiagramNode>();
    for (const n of template.nodes) m.set(n.id, n);
    return m;
  }, [template.nodes]);

  // TEMP: mocked “active edges” (later will be driven by cycle simulation)
  const activeEdgeIds = useMemo(() => new Set<string>(["e_imem_to_ifid"]), []);

  const stages = template.nodes.filter((n) => n.kind === "stage");
  const pipelineRegs = template.nodes.filter((n) => n.kind === "pipeline_reg");
  const blocks = template.nodes.filter((n) => n.kind === "block");
  const muxes = template.nodes.filter((n) => n.kind === "mux");
  const units = template.nodes.filter((n) => n.kind === "unit");

  return (
    <div className={styles.root}>
      {/* NEW: overlay controls */}
      <div className={styles.overlay}>
        <button
          type="button"
          className={styles.layerToggle}
          data-on={visibleLayers.data ? "true" : "false"}
          onClick={() => toggleLayer("data")}
        >
          Data
        </button>
        <button
          type="button"
          className={styles.layerToggle}
          data-on={visibleLayers.control ? "true" : "false"}
          onClick={() => toggleLayer("control")}
        >
          Control
        </button>
        <button
          type="button"
          className={styles.layerToggle}
          data-on={visibleLayers.forwarding ? "true" : "false"}
          onClick={() => toggleLayer("forwarding")}
        >
          Fwd
        </button>
      </div>

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
        {/* Arrowhead marker (uses currentColor) */}
        <defs>
          <marker
            id="pcv-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>

        {/* Background */}
        <rect className={styles.canvasBg} x={0} y={0} width="100%" height="100%" />

        {/* Viewport transform */}
        <g transform={`translate(${vp.tx} ${vp.ty}) scale(${vp.scale})`}>
          <g className={styles.layerStages}>
            {stages.map((n) => (
              <StageBand key={n.id} node={n} />
            ))}
          </g>

          {/* Edges under nodes */}
          <g className={styles.layerEdges}>
            {template.edges.map((e) => {
              if (!visibleLayers[e.layer]) return null;

              const fromNode = nodeById.get(e.from.nodeId);
              const toNode = nodeById.get(e.to.nodeId);
              if (!fromNode || !toNode) return null;

              const fromPort = findPort(fromNode, e.from.portId);
              const toPort = findPort(toNode, e.to.portId);
              if (!fromPort || !toPort) return null;

              const p1 = getPortPosition(fromNode, fromPort);
              const p2 = getPortPosition(toNode, toPort);

              const d = routeEdge(p1, fromPort, p2, toPort, {leadPx: layoutVars.lead});

              return (
                <path
                  key={e.id}
                  className={styles.edge}
                  d={d}
                  data-layer={e.layer}
                  data-active={activeEdgeIds.has(e.id) ? "true" : "false"}
                  markerEnd="url(#pcv-arrow)"
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