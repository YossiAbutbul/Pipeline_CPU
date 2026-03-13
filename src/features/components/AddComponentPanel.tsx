import { useState } from "react";
import { ArrowLeft, Binary, MoveHorizontal, Split } from "lucide-react";
import { SettingsPanel } from "@/ui/components";
import "./addComponentPanel.css";

export type AddableComponentType = "neg" | "not" | "shift";

type ShiftDirection = "left" | "right";
type ShiftMode = "logical" | "arithmetic";
type PanelView = "main" | "shift";

const COMPONENT_OPTIONS: Array<{
  id: AddableComponentType;
  title: string;
  description: string;
  icon: typeof Binary;
}> = [
  {
    id: "neg",
    title: "NEG",
    description: "Negate the input value before it continues through the path.",
    icon: Binary,
  },
  {
    id: "not",
    title: "NOT",
    description: "Flip all bits of the input value with a bitwise NOT operation.",
    icon: Split,
  },
  {
    id: "shift",
    title: "SHIFT",
    description: "Shift left or right by a chosen amount with logical or arithmetic behavior.",
    icon: MoveHorizontal,
  },
];

type Props = {
  onClose: () => void;
};

export function AddComponentPanel({ onClose }: Props) {
  const [selectedType, setSelectedType] = useState<AddableComponentType>("neg");
  const [shiftDirection, setShiftDirection] = useState<ShiftDirection>("left");
  const [shiftMode, setShiftMode] = useState<ShiftMode>("logical");
  const [shiftAmount, setShiftAmount] = useState("1");
  const [view, setView] = useState<PanelView>("main");

  return (
    <SettingsPanel
      open
      title="Add Component"
      closeLabel="Close add component panel"
      className="addComponentPanelShell"
      onClose={onClose}
    >
      {view === "main" ? (
        <>
          <div className="addComponentPanelIntro">
            Drag a component into the diagram to place it in the pipeline path.
          </div>

          <div className="addComponentOptionList" role="radiogroup" aria-label="Component type">
            {COMPONENT_OPTIONS.map((option, index) => {
              const Icon = option.icon;
              const isSelected = selectedType === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`addComponentOption ${isSelected ? "addComponentOptionSelected" : ""}`.trim()}
                  style={{ animationDelay: `${90 + index * 45}ms` }}
                  onClick={() => {
                    if (option.id === "shift") {
                      setSelectedType("shift");
                      setView("shift");
                      return;
                    }

                    setSelectedType(option.id);
                  }}
                >
                  <span className="addComponentOptionIcon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="addComponentOptionText">
                    <span className="addComponentOptionTitle">{option.title}</span>
                    <span className="addComponentOptionDescription">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <section className="addComponentShiftConfig" aria-label="Shift configuration">
          <div className="addComponentSectionTitle">Shift Setup</div>
          <div className="addComponentPanelIntro addComponentShiftIntro">
            Set the shift behavior, then drag it into the diagram.
          </div>

          <div className="addComponentField">
            <label className="addComponentFieldLabel" htmlFor="shift-direction">
              Direction
            </label>
            <select
              id="shift-direction"
              className="addComponentSelect"
              value={shiftDirection}
              onChange={(event) => setShiftDirection(event.target.value as ShiftDirection)}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className="addComponentField">
            <label className="addComponentFieldLabel" htmlFor="shift-mode">
              Mode
            </label>
            <select
              id="shift-mode"
              className="addComponentSelect"
              value={shiftMode}
              onChange={(event) => setShiftMode(event.target.value as ShiftMode)}
            >
              <option value="logical">Logical</option>
              <option value="arithmetic">Arithmetic</option>
            </select>
          </div>

          <div className="addComponentField">
            <label className="addComponentFieldLabel" htmlFor="shift-amount">
              Amount
            </label>
            <input
              id="shift-amount"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              className="addComponentNumberInput"
              value={shiftAmount}
              onChange={(event) => setShiftAmount(event.target.value)}
            />
          </div>

          <div className="addComponentShiftFooter">
            <button
              type="button"
              className="addComponentBackButton"
              onClick={() => setView("main")}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
          </div>
        </section>
      )}
    </SettingsPanel>
  );
}
