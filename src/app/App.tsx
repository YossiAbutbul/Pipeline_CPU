import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import ProgramEditor from "@/features/program/ProgramEditor";
import { usePipelineRunSession } from "@/features/simulator/hooks/usePipelineRunSession";
import StatePanel from "@/features/statePanels/StatePanel";
import { NotificationToast } from "@/ui/components";
import { useCallback, useState } from "react";
import { clearPersistedAppState, createDefaultAppState, usePersistedAppState } from "./store/appStore";
import "./app.css";

export default function App() {
  const [appState, setAppState] = usePersistedAppState();
  const [notifications, setNotifications] = useState<
    Array<{ id: number; title: string; message: string; tone: "success" | "error" }>
  >([]);
  const { program, initialPc, statePanelTab, registers, memory } = appState;

  const pushSuccessNotification = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const nextNotification = { id, title: "Registers updated", message, tone: "success" as const };
    setNotifications((prev) => [...prev, nextNotification].slice(-2));
  };

  const pushErrorNotification = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const nextNotification = { id, title: "Validation error", message, tone: "error" as const };
    setNotifications((prev) => [...prev, nextNotification].slice(-2));
  };

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  const setRegisterValues = (values: Record<string, string>) => {
    setAppState((prev) => ({ ...prev, registers: { ...prev.registers, values } }));
  };

  const {
    pipeline,
    memoryWords,
    changedMemoryWords,
    runSessionActive,
    registerHighlightCycle,
    clockCycle,
    canStepForward,
    canStepBackward,
    resetPipeline,
    run,
    stepForward,
    stepBackward,
    hoveredSignalValues,
  } = usePipelineRunSession({
    program,
    initialPc,
    memoryRules: memory.rules,
    registerValues: registers.values,
    onRegisterValuesChange: setRegisterValues,
  });

  const handleProgramChange = (nextProgram: string) => {
    setAppState((prev) => ({ ...prev, program: nextProgram }));
    resetPipeline();
  };

  const handleInitialPcChange = (value: string) => {
    setAppState((prev) => ({ ...prev, initialPc: value }));
    resetPipeline();
  };

  const handleResetPersistedData = () => {
    clearPersistedAppState();
    setAppState(createDefaultAppState());
    resetPipeline();
  };

  return (
    <div className="appShell">
      <aside className="leftPane">
        <ProgramEditor
          program={program}
          onProgramChange={handleProgramChange}
          onReset={resetPipeline}
          onRun={run}
          onStop={resetPipeline}
          isRunActive={runSessionActive}
          initialPc={initialPc}
          onInitialPcChange={handleInitialPcChange}
          onResetPersistedData={handleResetPersistedData}
        />
      </aside>

      <main className="centerPane">
        <PipelineCanvas
          pipeline={pipeline}
          hoveredSignalValues={hoveredSignalValues}
          clockCycle={clockCycle}
          showClockCycle={runSessionActive}
          onResetTracking={resetPipeline}
          onStepForward={stepForward}
          onStepBackward={stepBackward}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
        />
      </main>

      <aside className="rightPane">
        <StatePanel
          tab={statePanelTab}
          onTabChange={(tab) => setAppState((prev) => ({ ...prev, statePanelTab: tab }))}
          registerFormula={registers.formula}
          onRegisterFormulaChange={(formula) =>
            setAppState((prev) => ({ ...prev, registers: { ...prev.registers, formula } }))
          }
          registerIsEditing={registers.isEditing}
          onRegisterIsEditingChange={(isEditing) =>
            setAppState((prev) => ({ ...prev, registers: { ...prev.registers, isEditing } }))
          }
          registerValues={registers.values}
          onRegisterValuesChange={setRegisterValues}
          onNotifySuccess={pushSuccessNotification}
          onNotifyError={pushErrorNotification}
          registerHighlightCycle={registerHighlightCycle}
          memoryRules={memory.rules}
          onMemoryRulesChange={(rules) =>
            setAppState((prev) => ({ ...prev, memory: { ...prev.memory, rules } }))
          }
          runtimeMemoryWords={memoryWords}
          runtimeChangedWords={changedMemoryWords}
          isRuntimeLocked={runSessionActive}
        />
      </aside>
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}
