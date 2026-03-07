import { Panel, Tabs } from "@/ui/components";
import { useState } from "react";
import RegisterEditor from "./RegisterEditor";

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
      {tab === "registers" && <RegisterEditor />}
      {tab === "memory" && <div>Memory view </div>}
    </Panel>
  );
}
