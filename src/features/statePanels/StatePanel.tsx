import { Panel, Tabs } from "@/ui/components";
import { useState } from "react";

type TabKey = "registers" | "memory" | "pipeline";

export default function StatePanel() {
  const [tab, setTab] = useState<TabKey>("registers");

  return (
    <Panel
      headerSize="xs"
      toolbar={
        <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "center" }}>
          <Tabs<TabKey>
            items={[
              { key: "registers", label: "Registers" },
              { key: "memory", label: "Memory" },
              { key: "pipeline", label: "Pipeline" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      }
    >
      {tab === "registers" && <div>Registers view (next step)</div>}
      {tab === "memory" && <div>Memory view (next step)</div>}
      {tab === "pipeline" && <div>Pipeline registers view (next step)</div>}
    </Panel>
  );
}