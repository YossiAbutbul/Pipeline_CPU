export type DiagramId = string;

export type DiagramLayer = "data" | "control" | "forwarding";

export type Point = { x: number; y: number };

export type Port = {
  id: string;
  label?: string;
};

export type DiagramNode = {
  id: string;
  kind:
    | "stage"
    | "pipeline_reg"
    | "block"
    | "mux"
    | "unit"; // hazard/forwarding/etc.
  label: string;
  ports?: {
    in?: Port[];
    out?: Port[];
  };
  layout: {
    position: Point; // template coordinates (renderer interprets)
    size: { w: number; h: number };
  };
};

export type DiagramEdge = {
  id: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
  layer: DiagramLayer;
};

export type DiagramTemplate = {
  id: DiagramId;
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  meta?: {
    stages: Array<"IF" | "ID" | "EX" | "MEM" | "WB">;
  };
};