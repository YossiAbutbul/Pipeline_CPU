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
  runtimeMemoryWords: Map<number, number>;
  runtimeChangedWords: number[];
  isRuntimeLocked: boolean;
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
  runtimeMemoryWords,
  runtimeChangedWords,
  isRuntimeLocked,
}: Props) {
  return (
    <Panel
      headerSize="xs"
      toolbar={
        <Tabs<TabKey>
          items={[
            { key: "registers", label: "Registers" },
            { key: "memory", label: "Memory" },
          ]}
          value={tab}
          onChange={onTabChange}
        />
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
          isRuntimeLocked={isRuntimeLocked}
        />
      )}
      {tab === "memory" && (
        <MemoryEditor
          rules={memoryRules}
          onRulesChange={onMemoryRulesChange}
          runtimeMemoryWords={runtimeMemoryWords}
          runtimeChangedWords={runtimeChangedWords}
          isRuntimeLocked={isRuntimeLocked}
        />
      )}
    </Panel>
  );
}
