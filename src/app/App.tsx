import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import { PendingComponentOverlay } from "@/features/components/placement/PendingComponentOverlay";
import { usePendingComponentPlacement } from "@/features/components/placement/usePendingComponentPlacement";
import ProgramEditor from "@/features/program/ProgramEditor";
import { usePipelineRunSession } from "@/features/simulator/hooks/usePipelineRunSession";
import StatePanel from "@/features/statePanels/StatePanel";
import { GuidedTourTooltip, NotificationToast } from "@/ui/components";
import { useCallback, useEffect } from "react";
import { useGuidedTour } from "./hooks/useGuidedTour";
import { useNotificationQueue } from "./hooks/useNotificationQueue";
import { clearPersistedAppState, createDefaultAppState, usePersistedAppState } from "./store/appStore";
import "./app.css";

const GUIDED_TOUR_TOTAL_STEPS = 9;

export default function App() {
  const [appState, setAppState] = usePersistedAppState();
  const { notifications, pushNotification, dismissNotification } = useNotificationQueue();
  const {
    guidedTourStep,
    setGuidedTourStep,
    completeGuidedTour,
    resetGuidedTour,
    goToNextTourStep,
    goToPreviousTourStep,
  } = useGuidedTour(GUIDED_TOUR_TOTAL_STEPS);
  const {
    pendingComponentLabel,
    placedComponents,
    beginComponentPlacement,
    cancelComponentPlacement,
    placePendingComponent,
    deletePlacedComponent,
    resetComponentPlacement,
  } = usePendingComponentPlacement();
  const { program, initialPc, statePanelTab, registers, memory } = appState;

  const pushSuccessNotification = (message: string) => {
    pushNotification({ title: "Registers updated", message, tone: "success" });
  };

  const pushProgramErrorNotification = (message: string) =>
    pushNotification({ title: "Program error", message, tone: "error" });

  const pushRegisterErrorNotification = (message: string) =>
    pushNotification({ title: "Register error", message, tone: "error" });

  const pushMemoryErrorNotification = (message: string) =>
    pushNotification({ title: "Memory rule error", message, tone: "error" });

  const pushRuntimeErrorNotification = (message: string) =>
    pushNotification({ title: "Runtime error", message, tone: "error" });

  const handleCompleteGuidedTour = useCallback(() => {
    completeGuidedTour();
    setAppState((prev) => ({ ...prev, statePanelTab: "registers" }));
  }, [completeGuidedTour, setAppState]);

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
    placedComponents,
    registerValues: registers.values,
    onRegisterValuesChange: setRegisterValues,
    onRunError: pushProgramErrorNotification,
    onRuntimeError: pushRuntimeErrorNotification,
  });

  useEffect(() => {
    if (guidedTourStep === 2 && statePanelTab !== "registers") {
      setAppState((prev) => ({ ...prev, statePanelTab: "registers" }));
    }

    if ((guidedTourStep === 3 || guidedTourStep === 7) && statePanelTab !== "memory") {
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
    setAppState(createDefaultAppState());
    resetPipeline();
    resetComponentPlacement();
    resetGuidedTour();
  };

  const handleRun = () => {
    run();
    setGuidedTourStep((currentStep) => (currentStep === 5 ? 6 : currentStep));
  };

  const handleStop = () => {
    resetPipeline();
    setGuidedTourStep((currentStep) => {
      if (currentStep === null) {
        return currentStep;
      }
      return currentStep >= 6 ? 5 : currentStep;
    });
  };

  const handleResetTracking = () => {
    resetPipeline();
    setGuidedTourStep((currentStep) => {
      if (currentStep === null) {
        return currentStep;
      }
      return currentStep >= 6 ? 5 : currentStep;
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
          showAddComponentTourStep={guidedTourStep === 4}
          onBackAddComponentTourStep={goToPreviousTourStep}
          onNextAddComponentTourStep={goToNextTourStep}
          onNextInitialPcTourStep={goToNextTourStep}
          showRunTourStep={guidedTourStep === 5}
          onBackRunTourStep={goToPreviousTourStep}
          onNextRunTourStep={goToNextTourStep}
          onDismissRunTour={handleCompleteGuidedTour}
          onAddComponent={beginComponentPlacement}
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
          onSkip={handleCompleteGuidedTour}
          onClose={handleCompleteGuidedTour}
        >
          <span className="welcomeTourAnchor" aria-hidden="true" />
        </GuidedTourTooltip>
        <PipelineCanvas
          pipeline={pipeline}
          hoveredSignalValues={hoveredSignalValues}
          clockCycle={clockCycle}
          showClockCycle={runSessionActive}
          enableSignalHover={runSessionActive}
          onResetTracking={handleResetTracking}
          onStepForward={handleStepForward}
          onStepBackward={stepBackward}
          canStepBackward={canStepBackward}
          canStepForward={canStepForward}
          showStepForwardTourStep={guidedTourStep === 6}
          onBackStepForwardTourStep={goToPreviousTourStep}
          onNextStepForwardTourStep={goToNextTourStep}
          showHoverDiagramTourStep={guidedTourStep === 8}
          onBackHoverDiagramTourStep={goToPreviousTourStep}
          onDismissTour={handleCompleteGuidedTour}
          placedComponents={placedComponents}
          pendingComponentLabel={pendingComponentLabel}
          onPlacePendingComponent={placePendingComponent}
          onDeletePlacedComponent={deletePlacedComponent}
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
          onRegisterError={pushRegisterErrorNotification}
          onMemoryError={pushMemoryErrorNotification}
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
          showRuntimeMemoryTourStep={guidedTourStep === 7}
          onBackRuntimeMemoryTourStep={goToPreviousTourStep}
          onNextRuntimeMemoryTourStep={goToNextTourStep}
          onDismissTour={handleCompleteGuidedTour}
        />
      </aside>
      {pendingComponentLabel ? (
        <div
          className="dragCancelZone"
          onClick={cancelComponentPlacement}
          aria-label="Cancel pending component placement"
        >
          <span className="dragCancelIcon" aria-hidden="true">
            x
          </span>
          <span className="dragCancelText">Cancel Placement</span>
        </div>
      ) : null}
      {pendingComponentLabel ? <PendingComponentOverlay label={pendingComponentLabel} /> : null}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}
