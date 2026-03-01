import type { DiagramNode, Port } from "./diagramTypes";

export function getPortPosition(node: DiagramNode, port: Port) {
  const x = node.layout.position.x;
  const y = node.layout.position.y;
  const w = node.layout.size.w;
  const h = node.layout.size.h;

  switch (port.anchor) {
    case "left":
      return { x, y: y + h * port.offset };
    case "right":
      return { x: x + w, y: y + h * port.offset };
    case "top":
      return { x: x + w * port.offset, y };
    case "bottom":
      return { x: x + w * port.offset, y: y + h };
  }
}