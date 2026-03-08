import { Panel, Tabs } from "@/ui/components";
import type { MemoryRuleConfig, TabKey } from "@/app/store/appStore";
import MemoryEditor from "./MemoryEditor";
import RegisterEditor from "./RegisterEditor";

type Props = {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  registerFormula: string;
  onRegisterFormulaChange: (value: string) => void;
  registerIsEditing: boolean;
  onRegisterIsEditingChange: (value: boolean) => void;
  registerValues: Record<string, string>;
  onRegisterValuesChange: (value: Record<string, string>) => void;
  memoryRules: MemoryRuleConfig[];
  onMemoryRulesChange: (rules: MemoryRuleConfig[]) => void;
};

export default function StatePanel({
  tab,
  onTabChange,
  registerFormula,
  onRegisterFormulaChange,
  registerIsEditing,
  onRegisterIsEditingChange,
  registerValues,
  onRegisterValuesChange,
  memoryRules,
  onMemoryRulesChange,
}: Props) {
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
            onChange={onTabChange}
          />
        </div>
      }
    >
      {tab === "registers" && (
        <RegisterEditor
          formula={registerFormula}
          onFormulaChange={onRegisterFormulaChange}
          isEditing={registerIsEditing}
          onIsEditingChange={onRegisterIsEditingChange}
          values={registerValues}
          onValuesChange={onRegisterValuesChange}
        />
      )}
      {tab === "memory" && <MemoryEditor rules={memoryRules} onRulesChange={onMemoryRulesChange} />}
    </Panel>
  );
}
