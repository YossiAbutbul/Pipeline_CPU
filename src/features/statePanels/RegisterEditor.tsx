import { Button } from "@/ui/components";
import { Check, Settings2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  evaluateRegisterFormula,
  parseRegisterValue,
  REGISTERS,
  toHex32,
  createDefaultRegisterValues,
} from "./registerEditorModel";
import "./registerEditor.css";

export default function RegisterEditor() {
  const [formula, setFormula] = useState("num * 0x200");
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => createDefaultRegisterValues());

  const valueRows = useMemo(
    () =>
      REGISTERS.map((reg) => ({
        ...reg,
        key: reg.alias,
        value: values[reg.alias] ?? "0x00000000",
      })),
    [values],
  );

  const applyFormula = () => {
    try {
      const next: Record<string, string> = {};
      for (const reg of REGISTERS) {
        const computed = reg.alias === "zero" ? 0 : evaluateRegisterFormula(formula, reg.num);
        next[reg.alias] = toHex32(computed);
      }
      setValues(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const resetAll = () => {
    setValues(createDefaultRegisterValues());
    setError(null);
  };

  const updateRegister = (alias: string, raw: string) => {
    setValues((prev) => ({ ...prev, [alias]: raw }));
  };

  const normalizeRegister = (alias: string) => {
    if (alias === "zero") {
      setValues((prev) => ({ ...prev, zero: "0x00000000" }));
      return;
    }

    const current = values[alias] ?? "";
    try {
      const parsed = parseRegisterValue(current);
      setValues((prev) => ({ ...prev, [alias]: toHex32(parsed) }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleEditMode = () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    try {
      const nextValues = { ...values };
      for (const reg of REGISTERS) {
        if (reg.alias === "zero") {
          nextValues.zero = "0x00000000";
          continue;
        }
        const parsed = parseRegisterValue(values[reg.alias] ?? "0");
        nextValues[reg.alias] = toHex32(parsed);
      }
      setValues(nextValues);
      setError(null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="registerEditor">
      {isEditing && (
        <>
          <div className="registerFormulaBar">
            <label htmlFor="registerFormula" className="registerFormulaLabel">
              Formula
            </label>
            <input
              id="registerFormula"
              className="registerFormulaInput"
              value={formula}
              onChange={(event) => setFormula(event.target.value)}
              placeholder="num * 0x200"
              spellCheck={false}
            />
            <div className="registerFormulaActions">
              <Button size="sm" className="registerActionBtn" onClick={applyFormula}>
                Apply
              </Button>
            </div>
          </div>
          <div className="registerFormulaHint">Use variables: `num`, `number`, `index`, or `i`.</div>
        </>
      )}

      {error && <div className="registerError">{error}</div>}

      <div className="registerTableToolbar">
        <Button size="sm" className="registerEditToggle registerActionBtn" onClick={toggleEditMode}>
          {isEditing ? <Check size={14} aria-hidden="true" /> : <Settings2 size={14} aria-hidden="true" />}
          {isEditing ? "Done Editing" : "Edit Registers"}
        </Button>
        {isEditing && (
          <Button size="sm" className="registerClearToggle registerActionBtn" onClick={resetAll}>
            <Trash2 size={14} aria-hidden="true" />
            Clear Values
          </Button>
        )}
      </div>

      <div className="registerList" role="table" aria-label="Registers initial values">
        <div className="registerStickyHeader">
          <div className="registerHeaderRow" role="row">
            <div className="registerHeaderCell" role="columnheader">
              Name
            </div>
            <div className="registerHeaderCell" role="columnheader">
              Number
            </div>
            <div className="registerHeaderCell registerHeaderCellValue" role="columnheader">
              Value
            </div>
          </div>
        </div>
        {valueRows.map((row) => (
          <div className="registerRow" role="row" key={row.key}>
            <div className="registerName" role="cell">{`$${row.alias}`}</div>
            <div className="registerNum" role="cell">{`${row.num}`}</div>
            <input
              className="registerValueInput"
              role="cell"
              value={row.value}
              onChange={(event) => updateRegister(row.alias, event.target.value)}
              onBlur={() => normalizeRegister(row.alias)}
              spellCheck={false}
              aria-label={`Value for register ${row.alias}`}
              readOnly={!isEditing || row.alias === "zero"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
