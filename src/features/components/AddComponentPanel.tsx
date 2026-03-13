import { useState } from "react";
import { Binary, Minus, MoveHorizontal } from "lucide-react";
import { Button, SettingsPanel } from "@/ui/components";
import "./addComponentPanel.css";

export type AddableComponentType = "neg" | "not" | "shift";

type ShiftDirection = "left" | "right";
type ShiftMode = "logical" | "arithmetic";
type PanelView = "main" | "shift";

type Props = {
  onClose: () => void;
  onAddComponent: (label: string) => void;
};

function getShiftShortLabel(direction: ShiftDirection, mode: ShiftMode, amount: string) {
  const normalizedAmount = amount.trim() || "0";
  if (direction === "left") {
    return `SLL ${normalizedAmount}`;
  }
  return mode === "logical" ? `SLR ${normalizedAmount}` : `SAR ${normalizedAmount}`;
}

export function AddComponentPanel({ onClose, onAddComponent }: Props) {
  const [shiftDirection, setShiftDirection] = useState<ShiftDirection>("left");
  const [shiftMode, setShiftMode] = useState<ShiftMode>("logical");
  const [shiftAmount, setShiftAmount] = useState("1");
  const [view, setView] = useState<PanelView>("main");
  const shiftLabel = getShiftShortLabel(shiftDirection, shiftMode, shiftAmount);

  const handleAdd = (label: string) => {
    onAddComponent(label);
    onClose();
  };

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
            Add a component, then place it on the diagram or cancel it from the top area.
          </div>

          <div className="addComponentOptionList" aria-label="Component type">
            <div className="addComponentOptionRow" style={{ animationDelay: "90ms" }}>
              <span className="addComponentOptionIcon" aria-hidden="true">
                <Minus size={18} />
              </span>
              <span className="addComponentOptionText">
                <span className="addComponentOptionTitle">NEG</span>
                <span className="addComponentOptionDescription">Negate the value before it continues.</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="addComponentActionButton"
                onClick={() => handleAdd("NEG")}
              >
                Add
              </Button>
            </div>

            <div className="addComponentOptionRow" style={{ animationDelay: "135ms" }}>
              <span className="addComponentOptionIcon" aria-hidden="true">
                <Binary size={18} />
              </span>
              <span className="addComponentOptionText">
                <span className="addComponentOptionTitle">NOT</span>
                <span className="addComponentOptionDescription">Invert all bits of the value.</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="addComponentActionButton"
                onClick={() => handleAdd("NOT")}
              >
                Add
              </Button>
            </div>

            <div className="addComponentOptionRow" style={{ animationDelay: "180ms" }}>
              <span className="addComponentOptionIcon" aria-hidden="true">
                <MoveHorizontal size={18} />
              </span>
              <span className="addComponentOptionText">
                <span className="addComponentOptionTitle">SHIFT</span>
                <span className="addComponentOptionDescription">Configure direction, mode, and amount first.</span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="addComponentActionButton"
                onClick={() => setView("shift")}
              >
                Setup
              </Button>
            </div>
          </div>
        </>
      ) : (
        <section className="addComponentShiftConfig" aria-label="Shift configuration">
          <div className="addComponentSectionTitle">Shift Setup</div>
          <div className="addComponentPanelIntro addComponentShiftIntro">
            Add the configured shift, then place it on the diagram or cancel it from the top area.
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="addComponentBackButton"
              onClick={() => setView("main")}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="addComponentActionButton"
              onClick={() => handleAdd(shiftLabel)}
            >
              Add
            </Button>
          </div>
        </section>
      )}
    </SettingsPanel>
  );
}
