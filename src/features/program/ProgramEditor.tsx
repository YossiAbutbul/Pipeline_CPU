import { Button, Panel, ThemeToggle, CodeEditor } from "@/ui/components";
import { useState } from "react";
import "./programEditor.css";

export default function ProgramEditor() {
  const [program, setProgram] = useState(
    "# Write MIPS here...\n"
  );

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
          <CodeEditor
            value={program}
            onChange={setProgram}
            placeholder={"# Write MIPS here...\nadd $1,$2,$3\n"}
            minLines={1}
          />
        </div>

        

        <div className="programFooter">
          <ThemeToggle label="Dark mode" />
        </div>
      </div>
    </Panel>
  );
}