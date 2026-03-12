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
  onNotifySuccess: (message: string) => void;
  onNotifyError: (message: string) => void;
  registerHighlightCycle: number;
  memoryRules: MemoryRuleConfig[];
  onMemoryRulesChange: (rules: MemoryRuleConfig[]) => void;
  runtimeMemoryWords: Map<number, number>;
  runtimeChangedWords: number[];
  isRuntimeLocked: boolean;
  showEditRegistersTourStep: boolean;
  onBackEditRegistersTourStep: () => void;
  onNextEditRegistersTourStep: () => void;
  showAddRulesTourStep: boolean;
  onBackAddRulesTourStep: () => void;
  onNextAddRulesTourStep: () => void;
  showRuntimeMemoryTourStep: boolean;
  onBackRuntimeMemoryTourStep: () => void;
  onNextRuntimeMemoryTourStep: () => void;
  onDismissTour: () => void;
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
  onNotifySuccess,
  onNotifyError,
  registerHighlightCycle,
  memoryRules,
  onMemoryRulesChange,
  runtimeMemoryWords,
  runtimeChangedWords,
  isRuntimeLocked,
  showEditRegistersTourStep,
  onBackEditRegistersTourStep,
  onNextEditRegistersTourStep,
  showAddRulesTourStep,
  onBackAddRulesTourStep,
  onNextAddRulesTourStep,
  showRuntimeMemoryTourStep,
  onBackRuntimeMemoryTourStep,
  onNextRuntimeMemoryTourStep,
  onDismissTour,
}: Props) {
  return (
    <Panel
      className="panelOverflowVisible"
      headerSize="xs"
      bodyClassName="panelBodyVisible"
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
          onNotifySuccess={onNotifySuccess}
          onNotifyError={onNotifyError}
          highlightCycle={registerHighlightCycle}
          isRuntimeLocked={isRuntimeLocked}
          showEditRegistersTourStep={showEditRegistersTourStep}
          onBackEditRegistersTourStep={onBackEditRegistersTourStep}
          onNextEditRegistersTourStep={onNextEditRegistersTourStep}
          onDismissTour={onDismissTour}
        />
      )}
      {tab === "memory" && (
        <MemoryEditor
          rules={memoryRules}
          onRulesChange={onMemoryRulesChange}
          onNotifyError={onNotifyError}
          runtimeMemoryWords={runtimeMemoryWords}
          runtimeChangedWords={runtimeChangedWords}
          isRuntimeLocked={isRuntimeLocked}
          showAddRulesTourStep={showAddRulesTourStep}
          onBackAddRulesTourStep={onBackAddRulesTourStep}
          onNextAddRulesTourStep={onNextAddRulesTourStep}
          showRuntimeMemoryTourStep={showRuntimeMemoryTourStep}
          onBackRuntimeMemoryTourStep={onBackRuntimeMemoryTourStep}
          onNextRuntimeMemoryTourStep={onNextRuntimeMemoryTourStep}
          onDismissTour={onDismissTour}
        />
      )}
    </Panel>
  );
}
