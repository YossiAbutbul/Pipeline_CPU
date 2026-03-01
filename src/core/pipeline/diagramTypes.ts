export type DiagramId = string;
export type DiagramLayer = "data" | "control" | "forwarding";

export type Point = { x: number; y: number };

export type PortAnchor =
  | "left"
  | "right"
  | "top"
  | "bottom";

export type Port = {
  id: string;
  label?: string;
  anchor: PortAnchor;
  offset: number;
};

export type DiagramNode = {
  id: string;
  kind: "stage" | "pipeline_reg" | "block" | "mux" | "unit";
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



