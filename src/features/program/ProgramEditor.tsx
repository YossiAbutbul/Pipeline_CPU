import { Button, Panel, ThemeToggle } from "@/ui/components";
import { MipsMonaco } from "@/ui/components/MipsMonaco";
import { useTheme } from "@/ui/theme/ThemeProvider";
import { Play, RotateCcw, Square, Trash2 } from "lucide-react";
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
}: Props) {
  const { themeMode } = useTheme();

  const handleClearProgram = () => {
    onProgramChange(DEFAULT_PROGRAM);
    onReset();
  };

  return (
    <Panel
      title="Program"
      headerSize="lg"
      toolbar={
        <>
          <Button size="sm">Load</Button>
          {import.meta.env.DEV && (
            <Button size="sm" variant="secondary" onClick={onResetPersistedData}>
              Reset Dbug
            </Button>
          )}
        </>
      }
    >
      <div className="programLayout">
        <div className="initialPcRow">
          <label htmlFor="initialPc" className="initialPcLabel">
            Initial PC:
          </label>
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
        </div>
        <div className="programControls">
          <div className="programActions">
            <Button
              onClick={isRunActive ? onStop : onRun}
              variant="primary"
              className="programActionButton"
            >
              {isRunActive ? <Square size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {isRunActive ? "Stop" : "Run"}
            </Button>
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
            aria-label="Reset editor text"
            title="Reset editor text"
          >
            <Trash2 size={16} aria-hidden="true" className="clearProgramIcon" />
          </Button>
        </div>

        <div className="programEditorBox">
          <MipsMonaco value={program} onChange={onProgramChange} themeMode={themeMode} height="100%" />
        </div>

        <div className="programFooter">
          <ThemeToggle label={themeMode === "dark" ? "Dark Mode" : "Light Mode"} />
        </div>
      </div>
    </Panel>
  );
}
