import PipelineCanvas from "@/features/pipelineCanvas/PipelineCanvas";
import ProgramEditor from "@/features/program/ProgramEditor";
import StatePanel from "@/features/statePanels/StatePanel";
import "./app.css";

export default function App() {
  return (
    <div className="appShell">
      <aside className="leftPane">
        <ProgramEditor />
      </aside>

      <main className="centerPane">
        <PipelineCanvas />
      </main>

      <aside className="rightPane">
        <StatePanel />
      </aside>
    </div>
  );
}