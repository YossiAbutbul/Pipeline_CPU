import type { Point, Port } from "../diagramTypes";

export type RouteEdgeOpts = {
  leadPx: number; // template-coordinate units
};

/**
 * Deterministic orthogonal routing (pairwise).
 * Rails/bundling will replace this implementation later without changing the view.
 */
export function routeEdge(
  p1: Point,
  fromPort: Port,
  p2: Point,
  toPort: Port,
  opts: RouteEdgeOpts
) {
  const lead = opts.leadPx;

  const d1 = anchorDir(fromPort.anchor);
  const d2 = anchorDir(toPort.anchor);

  const a1 = { x: p1.x + d1.x * lead, y: p1.y + d1.y * lead };
  const a2 = { x: p2.x + d2.x * lead, y: p2.y + d2.y * lead };

  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;

  const preferHFirst = Math.abs(dx) >= Math.abs(dy);
  const mid = preferHFirst ? { x: a2.x, y: a1.y } : { x: a1.x, y: a2.y };

  return [
    `M ${p1.x} ${p1.y}`,
    `L ${a1.x} ${a1.y}`,
    `L ${mid.x} ${mid.y}`,
    `L ${a2.x} ${a2.y}`,
    `L ${p2.x} ${p2.y}`,
  ].join(" ");
}

function anchorDir(anchor: Port["anchor"]) {
  switch (anchor) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
  }
}