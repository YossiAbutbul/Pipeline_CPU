import { Button, Tooltip } from "@/ui/components";
import { Check, Edit, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [scrollbarThumbTop, setScrollbarThumbTop] = useState(0);
  const [scrollbarThumbHeight, setScrollbarThumbHeight] = useState(0);
  const [hasTableOverflow, setHasTableOverflow] = useState(false);
  const tableBodyRef = useRef<HTMLDivElement | null>(null);

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

  const updateOverlayScrollbar = () => {
    const bodyEl = tableBodyRef.current;
    if (!bodyEl) return;

    const { scrollTop, scrollHeight, clientHeight } = bodyEl;
    const hasOverflow = scrollHeight > clientHeight + 1;
    setHasTableOverflow(hasOverflow);

    if (!hasOverflow) {
      setScrollbarThumbTop(0);
      setScrollbarThumbHeight(0);
      return;
    }

    const minThumbHeight = 24;
    const thumbHeight = Math.max(minThumbHeight, (clientHeight / scrollHeight) * clientHeight);
    const maxThumbTop = clientHeight - thumbHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

    setScrollbarThumbHeight(thumbHeight);
    setScrollbarThumbTop(thumbTop);
  };

  useEffect(() => {
    updateOverlayScrollbar();

    const bodyEl = tableBodyRef.current;
    if (!bodyEl) return;

    const resizeObserver = new ResizeObserver(() => updateOverlayScrollbar());
    resizeObserver.observe(bodyEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [values]);

  return (
    <div className="registerEditor">
      {isEditing && (
        <>
          <div className="registerFormulaBar">
            <label htmlFor="registerFormula" className="registerFormulaLabel">
              Formula
            </label>
            <div className="registerFormulaInputWrap">
              <input
                id="registerFormula"
                className="registerFormulaInput"
                value={formula}
                onChange={(event) => setFormula(event.target.value)}
                placeholder="num * 0x200"
                spellCheck={false}
              />
              {error && (
                <Tooltip
                  variant="error"
                  ariaLabel="Formula error details"
                  align="start"
                  showTrigger={false}
                  open
                  autoDismissMs={2500}
                  dismissible
                  onDismiss={() => setError(null)}
                  content={error}
                />
              )}
            </div>
            <Tooltip
              ariaLabel="Formula format help"
              align="end"
              content={
                <>
                  Sets initial values for all registers except <code>$zero</code>.
                  <br />
                  <br />
                  Examples:
                  <br />
                  <code>num * 0x200</code>
                  <br />
                  <code>i + 4</code>
                  <br />
                  <code>=0x200</code> or <code>i = 0x200</code>
                </>
              }
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

      <div className="registerTableToolbar">
        <Button size="sm" className="registerEditToggle registerActionBtn" onClick={toggleEditMode}>
          {isEditing ? <Check size={14} aria-hidden="true" /> : <Edit size={14} aria-hidden="true" />}
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
        <div
          className="registerTableBodyWrap"
          onMouseEnter={() => setIsScrollbarVisible(true)}
          onMouseLeave={() => setIsScrollbarVisible(false)}
        >
          <div
            ref={tableBodyRef}
            className="registerTableBody"
            role="rowgroup"
            onScroll={updateOverlayScrollbar}
          >
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
          <div
            className={`registerOverlayScrollbar${isScrollbarVisible && hasTableOverflow ? " isVisible" : ""}`}
            aria-hidden="true"
          >
            <div
              className="registerOverlayThumb"
              style={{
                height: `${scrollbarThumbHeight}px`,
                transform: `translateY(${scrollbarThumbTop}px)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
