import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import ProgramEditor from "@/features/program/ProgramEditor";
import { usePipelineRunSession } from "@/features/simulator/hooks/usePipelineRunSession";
import StatePanel from "@/features/statePanels/StatePanel";
import { GuidedTourTooltip, NotificationToast } from "@/ui/components";
import { useCallback, useEffect, useState } from "react";
import { clearPersistedAppState, createDefaultAppState, usePersistedAppState } from "./store/appStore";
import "./app.css";

const GUIDED_TOUR_STORAGE_KEY = "pipeline-cpu.guided-tour-completed";
const GUIDED_TOUR_TOTAL_STEPS = 8;

function loadInitialGuidedTourStep() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(GUIDED_TOUR_STORAGE_KEY) === "true" ? null : 0;
}

export default function App() {
  const [appState, setAppState] = usePersistedAppState();
  const [notifications, setNotifications] = useState<
    Array<{ id: number; title: string; message: string; tone: "success" | "error" }>
  >([]);
  const [guidedTourStep, setGuidedTourStep] = useState<number | null>(() => loadInitialGuidedTourStep());
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

  const completeGuidedTour = useCallback(() => {
    setGuidedTourStep(null);
    setAppState((prev) => ({ ...prev, statePanelTab: "registers" }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, "true");
    }
  }, [setAppState]);

  const goToNextTourStep = useCallback(() => {
    setGuidedTourStep((current) => {
      if (current === null) {
        return current;
      }
      return current >= GUIDED_TOUR_TOTAL_STEPS - 1 ? current : current + 1;
    });
  }, []);

  const goToPreviousTourStep = useCallback(() => {
    setGuidedTourStep((current) => {
      if (current === null) {
        return current;
      }
      return current <= 0 ? current : current - 1;
    });
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
    onRunError: pushErrorNotification,
  });

  useEffect(() => {
    if (guidedTourStep === 2 && statePanelTab !== "registers") {
      setAppState((prev) => ({ ...prev, statePanelTab: "registers" }));
    }

    if ((guidedTourStep === 3 || guidedTourStep === 6) && statePanelTab !== "memory") {
      setAppState((prev) => ({ ...prev, statePanelTab: "memory" }));
    }
  }, [guidedTourStep, setAppState, statePanelTab]);

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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GUIDED_TOUR_STORAGE_KEY);
    }
    setAppState(createDefaultAppState());
    resetPipeline();
    setGuidedTourStep(0);
  };

  const handleRun = () => {
    run();
    setGuidedTourStep((currentStep) => (currentStep === 4 ? 5 : currentStep));
  };

  const handleStop = () => {
    resetPipeline();
    setGuidedTourStep((currentStep) => {
      if (currentStep === null) {
        return currentStep;
      }
      return currentStep >= 5 ? 4 : currentStep;
    });
  };

  const handleResetTracking = () => {
    resetPipeline();
    setGuidedTourStep((currentStep) => {
      if (currentStep === null) {
        return currentStep;
      }
      return currentStep >= 5 ? 4 : currentStep;
    });
  };

  const handleStepForward = () => {
    if (guidedTourStep === 5) {
      setGuidedTourStep(6);
    }
    stepForward();
  };

  return (
    <div className="appShell">
      <aside className="leftPane">
        <ProgramEditor
          program={program}
          onProgramChange={handleProgramChange}
          onReset={handleResetTracking}
          onRun={handleRun}
          onStop={handleStop}
          isRunActive={runSessionActive}
          initialPc={initialPc}
          onInitialPcChange={handleInitialPcChange}
          onResetPersistedData={handleResetPersistedData}
          showInitialPcTourStep={guidedTourStep === 1}
          onNextInitialPcTourStep={goToNextTourStep}
          showRunTourStep={guidedTourStep === 4}
          onBackRunTourStep={goToPreviousTourStep}
          onNextRunTourStep={goToNextTourStep}
          onDismissRunTour={completeGuidedTour}
        />
      </aside>

      <main className="centerPane">
        <GuidedTourTooltip
          open={guidedTourStep === 0}
          step={1}
          totalSteps={GUIDED_TOUR_TOTAL_STEPS}
        align="start"
        className="welcomeTourTooltip"
        title="Welcome to Pipeline CPU"
        description="This quick tour shows how to set up, run, and inspect the simulator."
          onNext={goToNextTourStep}
          nextLabel="Start"
          onSkip={completeGuidedTour}
          onClose={completeGuidedTour}
        >
          <span className="welcomeTourAnchor" aria-hidden="true" />
        </GuidedTourTooltip>
        <PipelineCanvas
          pipeline={pipeline}
          hoveredSignalValues={hoveredSignalValues}
          clockCycle={clockCycle}
          showClockCycle={runSessionActive}
          onResetTracking={handleResetTracking}
          onStepForward={handleStepForward}
          onStepBackward={stepBackward}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          showStepForwardTourStep={guidedTourStep === 5}
          onBackStepForwardTourStep={goToPreviousTourStep}
          onNextStepForwardTourStep={goToNextTourStep}
          showHoverDiagramTourStep={guidedTourStep === 7}
          onBackHoverDiagramTourStep={goToPreviousTourStep}
          onDismissTour={completeGuidedTour}
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
          showEditRegistersTourStep={guidedTourStep === 2}
          onBackEditRegistersTourStep={goToPreviousTourStep}
          onNextEditRegistersTourStep={goToNextTourStep}
          showAddRulesTourStep={guidedTourStep === 3}
          onBackAddRulesTourStep={goToPreviousTourStep}
          onNextAddRulesTourStep={goToNextTourStep}
          showRuntimeMemoryTourStep={guidedTourStep === 6}
          onBackRuntimeMemoryTourStep={goToPreviousTourStep}
          onNextRuntimeMemoryTourStep={goToNextTourStep}
          onDismissTour={completeGuidedTour}
        />
      </aside>
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}
