import { Panel, Tabs } from "@/ui/components";
import { useState } from "react";

type TabKey = "registers" | "memory";

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
              
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      }
    >
      {tab === "registers" && <div>Registers view </div>}
      {tab === "memory" && <div>Memory view </div>}
    </Panel>
  );
}