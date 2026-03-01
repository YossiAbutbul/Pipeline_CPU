import type { DiagramTemplate } from "@/core/pipeline/diagramTypes";
import styles from "./diagramDebugView.module.css";

export function DiagramDebugView({ template }: { template: DiagramTemplate }) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>{template.name}</div>
        <div className={styles.meta}>
          Nodes: {template.nodes.length} · Edges: {template.edges.length}
        </div>
      </div>

      <div className={styles.grid}>
        {template.nodes.map((n) => (
          <div key={n.id} className={styles.card}>
            <div className={styles.cardTitle}>
              {n.label}
              <span className={styles.badge}>{n.kind}</span>
            </div>
            <div className={styles.cardMeta}>
              id: {n.id}
              <br />
              pos: ({n.layout.position.x}, {n.layout.position.y})
              <br />
              size: {n.layout.size.w}×{n.layout.size.h}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}