import { Button, GuidedTourTooltip, Panel, SettingsPanel, Tooltip } from "@/ui/components";
import { MipsMonaco } from "@/ui/components/MipsMonaco";
import "@/ui/components/ThemeToggle/themeToggle.css";
import { useTheme } from "@/ui/theme/ThemeProvider";
import { AddComponentPanel } from "@/features/components/AddComponentPanel";
import { Play, Plus, RotateCcw, Settings, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import "./programEditor.css";

const DEFAULT_PROGRAM = "# Write MIPS here...\n";

type Props = {
  program: string;
  onProgramChange: (value: string) => void;
  onReset: () => void;
  onRun: () => void;
  onStop: () => void;
  isRunActive: boolean;
  initialPc: string;
  onInitialPcChange: (value: string) => void;
  onResetPersistedData: () => void;
  showInitialPcTourStep: boolean;
  onBackInitialPcTourStep?: () => void;
  onNextInitialPcTourStep: () => void;
  showRunTourStep: boolean;
  onBackRunTourStep: () => void;
  onNextRunTourStep: () => void;
  onDismissRunTour: () => void;
};

export default function ProgramEditor({
  program,
  onProgramChange,
  onReset,
  onRun,
  onStop,
  isRunActive,
  initialPc,
  onInitialPcChange,
  onResetPersistedData,
  showInitialPcTourStep,
  onBackInitialPcTourStep,
  onNextInitialPcTourStep,
  showRunTourStep,
  onBackRunTourStep,
  onNextRunTourStep,
  onDismissRunTour,
}: Props) {
  const { theme, themeMode, toggleTheme } = useTheme();
  const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleClearProgram = () => {
    onProgramChange(DEFAULT_PROGRAM);
    onReset();
  };

  return (
    <Panel
      title="Program"
      className="programPanel panelOverflowVisible"
      bodyClassName="panelBodyVisible"
      headerSize="lg"
      toolbar={
        <>
          <div
            className="programAddComponentAnchor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              size="sm"
              className="programToolbarButton"
              onClick={() => {
                setIsAddComponentOpen((prev) => !prev);
                setIsSettingsOpen(false);
              }}
              aria-expanded={isAddComponentOpen}
            >
              <Plus size={14} aria-hidden="true" />
              Add Component
            </Button>
            {isAddComponentOpen ? (
              <AddComponentPanel onClose={() => setIsAddComponentOpen(false)} />
            ) : null}
          </div>
          <div
            className="programSettingsAnchor"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="programToolbarIconButton"
              onClick={() => {
                setIsSettingsOpen((prev) => !prev);
                setIsAddComponentOpen(false);
              }}
              aria-label="Open settings"
              title="Settings"
              aria-expanded={isSettingsOpen}
            >
              <Settings size={18} aria-hidden="true" />
            </Button>
            <SettingsPanel
              open={isSettingsOpen}
              title="Settings"
              onClose={() => setIsSettingsOpen(false)}
            >
              <button
                type="button"
                className="programResetDbugButton"
                onClick={() => {
                  onResetPersistedData();
                  setIsSettingsOpen(false);
                }}
              >
                <RotateCcw size={18} aria-hidden="true" />
                Reset Dbug
              </button>

              <div className="programSettingRow">
                <span className="programSettingInlineLabel">Light Mode</span>
                <button
                  type="button"
                  className={`switch ${theme === "dark" ? "switchOn" : "switchOff"}`}
                  role="switch"
                  aria-checked={theme === "dark"}
                  aria-label="Toggle color mode"
                  onClick={toggleTheme}
                >
                  <span className="switchThumb" />
                </button>
              </div>
            </SettingsPanel>
          </div>
        </>
      }
    >
      <div className="programLayout">
        <div className="programTopSection">
          <div className="initialPcRow">
            <label htmlFor="initialPc" className="initialPcLabel">
              Initial PC:
            </label>
            <GuidedTourTooltip
              open={showInitialPcTourStep}
              step={2}
              totalSteps={8}
              align="end"
              className="initialPcTourAnchor"
              title="Set The Initial PC"
              description="Set the address where instruction fetch starts."
              onBack={onBackInitialPcTourStep}
              onNext={onNextInitialPcTourStep}
              onSkip={onDismissRunTour}
              onClose={onDismissRunTour}
            >
              <input
                id="initialPc"
                type="text"
                className="initialPcInput"
                value={initialPc}
                onChange={(event) => onInitialPcChange(event.target.value)}
                spellCheck={false}
                autoComplete="off"
                aria-label="Initial PC"
              />
            </GuidedTourTooltip>
            <Tooltip
              className="initialPcHelp initialPcTooltip"
              ariaLabel="Initial PC format help"
              align="end"
              content={
                <div className="initialPcTooltipPanel">
                  <div className="initialPcTooltipTitle">Initial PC</div>
                  <div className="initialPcTooltipList">
                    <div className="initialPcTooltipCard">
                      <code>0x00400000</code>
                      <div className="initialPcTooltipDescription">Start execution from a hex address</div>
                    </div>
                    <div className="initialPcTooltipCard">
                      <code>4194304</code>
                      <div className="initialPcTooltipDescription">Decimal values work too</div>
                    </div>
                  </div>
                  <div className="initialPcTooltipFooter">
                    Use the address of the first instruction you want the simulator to fetch.
                  </div>
                </div>
              }
            />
          </div>
        </div>

        <div className="programControlsSection">
          <div className="programActions">
            <GuidedTourTooltip
              open={showRunTourStep}
              step={5}
              totalSteps={8}
              align="start"
              fullWidth
              title="Run The Program"
              description="Press Run to start the simulator and load the first IF instruction."
              onBack={onBackRunTourStep}
              onSkip={onDismissRunTour}
              onNext={onNextRunTourStep}
              onClose={onDismissRunTour}
            >
              <Button
                onClick={isRunActive ? onStop : onRun}
                variant="primary"
                className="programActionButton"
              >
                {isRunActive ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
                {isRunActive ? "Stop" : "Run"}
              </Button>
            </GuidedTourTooltip>
            <Button onClick={onReset} variant="secondary" className="programActionButton">
              <RotateCcw size={14} aria-hidden="true" />
              Reset
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="clearProgramButton"
            onClick={handleClearProgram}
            aria-label="Delete editor text"
            title="Delete editor text"
          >
            <Trash2 size={16} aria-hidden="true" className="clearProgramIcon" />
          </Button>
        </div>

        <div className="programEditorSection">
          <MipsMonaco value={program} onChange={onProgramChange} themeMode={themeMode} height="100%" />
        </div>
      </div>
    </Panel>
  );
}
