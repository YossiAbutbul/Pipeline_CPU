import { useState } from "react";
import { Button, Panel, ThemeToggle } from "@/ui/components";
import { MipsMonaco } from "@/ui/components/MipsMonaco";
import { useTheme } from "@/ui/theme/ThemeProvider";
import "./programEditor.css";

const DEFAULT_PROGRAM = "#write MIPS here...\n";

export default function ProgramEditor() {
  const [program, setProgram] = useState(DEFAULT_PROGRAM);
  const { themeMode } = useTheme();

  const handleClearProgram = () => {
    setProgram(DEFAULT_PROGRAM);
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
            <Button variant="primary">Step</Button>
            <Button>Run</Button>
            <Button>Reset</Button>
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
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
              className="clearProgramIcon"
            >
              <path
                d="M9 3h6m-9 4h12m-1 0-.7 11.1A2 2 0 0 1 14.3 20H9.7a2 2 0 0 1-2-1.9L7 7m3 4v5m4-5v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>

        <div className="programEditorBox">
          <MipsMonaco value={program} onChange={setProgram} themeMode={themeMode} height="100%" />
        </div>

        <div className="programFooter">
          <ThemeToggle label="Dark mode" />
        </div>
      </div>
    </Panel>
  );
}
