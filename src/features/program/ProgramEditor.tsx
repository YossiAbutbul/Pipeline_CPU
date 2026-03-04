import { useState } from "react";
import { Button, Panel, ThemeToggle } from "@/ui/components";
import { MipsMonaco } from "@/ui/components/MipsMonaco";
import { useTheme } from "@/ui/theme/ThemeProvider";
import "./programEditor.css";

export default function ProgramEditor() {
  const [program, setProgram] = useState("# Write MIPS here...\nadd $t0,$t1,$t2\n");
  const { themeMode } = useTheme();

  return (
    <Panel
      title="Program"
      headerSize="lg"
      toolbar={
        <>
          <Button size="sm">Load</Button>
          <Button size="sm" variant="ghost">
            Clear
          </Button>
        </>
      }
    >
      <div className="programLayout">
        <div className="programControls">
          <Button variant="primary">Step</Button>
          <Button>Run</Button>
          <Button>Reset</Button>
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