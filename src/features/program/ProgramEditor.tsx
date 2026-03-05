import { Button, Panel, ThemeToggle } from "@/ui/components";
import { MipsMonaco } from "@/ui/components/MipsMonaco";
import { useTheme } from "@/ui/theme/ThemeProvider";
import { Trash2 } from "lucide-react";
import "./programEditor.css";

const DEFAULT_PROGRAM = "# Write MIPS here...\n";

type Props = {
  program: string;
  onProgramChange: (value: string) => void;
  onReset: () => void;
};

export default function ProgramEditor({
  program,
  onProgramChange,
  onReset,
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
        </>
      }
    >
      <div className="programLayout">
        <div className="programControls">
          <div className="programActions">
            <Button>Run</Button>
            <Button onClick={onReset}>Reset</Button>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
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
