import { Button, GuidedTourTooltip, Tooltip } from "@/ui/components";
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

type Props = {
  formula: string;
  onFormulaChange: (value: string) => void;
  isEditing: boolean;
  onIsEditingChange: (value: boolean) => void;
  values: Record<string, string>;
  onValuesChange: (value: Record<string, string>) => void;
  onNotifySuccess: (message: string) => void;
  onNotifyError: (message: string) => void;
  highlightCycle: number;
  isRuntimeLocked: boolean;
  showEditRegistersTourStep: boolean;
  onBackEditRegistersTourStep: () => void;
  onNextEditRegistersTourStep: () => void;
  onDismissTour: () => void;
};

export default function RegisterEditor({
  formula,
  onFormulaChange,
  isEditing,
  onIsEditingChange,
  values,
  onValuesChange,
  onNotifySuccess,
  onNotifyError,
  highlightCycle,
  isRuntimeLocked,
  showEditRegistersTourStep,
  onBackEditRegistersTourStep,
  onNextEditRegistersTourStep,
  onDismissTour,
}: Props) {
  const overlayInset = 12;
  const [recentlyChangedAliases, setRecentlyChangedAliases] = useState<Record<string, true>>({});
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [scrollbarThumbTop, setScrollbarThumbTop] = useState(0);
  const [scrollbarThumbHeight, setScrollbarThumbHeight] = useState(0);
  const [hasTableOverflow, setHasTableOverflow] = useState(false);
  const tableBodyRef = useRef<HTMLDivElement | null>(null);
  const previousValuesRef = useRef<Record<string, string> | null>(null);

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
      onValuesChange(next);
      onNotifySuccess("Register formula applied");
    } catch (err) {
      onNotifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const resetAll = () => {
    onValuesChange(createDefaultRegisterValues());
    onNotifySuccess("Registers reset");
  };

  const updateRegister = (alias: string, raw: string) => {
    onValuesChange({ ...values, [alias]: raw });
  };

  const normalizeRegister = (alias: string) => {
    if (alias === "zero") {
      onValuesChange({ ...values, zero: "0x00000000" });
      return;
    }

    const current = values[alias] ?? "";
    try {
      const parsed = parseRegisterValue(current);
      onValuesChange({ ...values, [alias]: toHex32(parsed) });
    } catch (err) {
      onNotifyError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleEditMode = () => {
    if (isRuntimeLocked) {
      return;
    }

    if (!isEditing) {
      onIsEditingChange(true);
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
      onValuesChange(nextValues);
      onNotifySuccess("Registers updated successfully");
      onIsEditingChange(false);
    } catch (err) {
      onNotifyError(err instanceof Error ? err.message : String(err));
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

    const trackHeight = Math.max(0, clientHeight - (overlayInset * 2));
    const minThumbHeight = 24;
    const thumbHeight = Math.max(minThumbHeight, (clientHeight / scrollHeight) * trackHeight);
    const maxThumbOffset = Math.max(0, trackHeight - thumbHeight);
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbTop = maxScrollTop > 0
      ? overlayInset + ((scrollTop / maxScrollTop) * maxThumbOffset)
      : overlayInset;

    setScrollbarThumbHeight(thumbHeight);
    setScrollbarThumbTop(thumbTop);
  };

  useEffect(() => {
    if (isRuntimeLocked && isEditing) {
      onIsEditingChange(false);
    }
  }, [isEditing, isRuntimeLocked, onIsEditingChange]);

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

  useEffect(() => {
    if (highlightCycle === 0) {
      previousValuesRef.current = values;
      setRecentlyChangedAliases({});
      return;
    }

    const previous = previousValuesRef.current;
    previousValuesRef.current = values;
    if (!previous) {
      setRecentlyChangedAliases({});
      return;
    }

    const changedAliases = REGISTERS
      .map((reg) => reg.alias)
      .filter((alias) => (previous[alias] ?? "0x00000000") !== (values[alias] ?? "0x00000000"));

    setRecentlyChangedAliases(
      Object.fromEntries(changedAliases.map((alias) => [alias, true] as const)),
    );
  }, [highlightCycle, values]);

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
                onChange={(event) => onFormulaChange(event.target.value)}
                placeholder="num * 0x200"
                spellCheck={false}
              />
            </div>
            <Tooltip
              className="registerFormulaHelp registerFormulaTooltip"
              ariaLabel="Formula format help"
              align="end"
              content={
                <div className="registerFormulaTooltipPanel">
                  <div className="registerFormulaTooltipTitle">Available Formulas</div>
                  <div className="registerFormulaTooltipList">
                    <div className="registerFormulaTooltipCard">
                      <code>num * 0x200</code>
                      <div className="registerFormulaTooltipDescription">Multiply by hex value</div>
                    </div>
                    <div className="registerFormulaTooltipCard">
                      <code>number + 100</code>
                      <div className="registerFormulaTooltipDescription">Add constant</div>
                    </div>
                    <div className="registerFormulaTooltipCard">
                      <code>index * 2</code>
                      <div className="registerFormulaTooltipDescription">Double the index</div>
                    </div>
                    <div className="registerFormulaTooltipCard">
                      <code>i % 10</code>
                      <div className="registerFormulaTooltipDescription">Modulo operation</div>
                    </div>
                    <div className="registerFormulaTooltipCard">
                      <code>num ** 2</code>
                      <div className="registerFormulaTooltipDescription">Power operation</div>
                    </div>
                  </div>
                  <div className="registerFormulaTooltipFooter">
                    Use variables:{" "}
                    <span className="registerFormulaTooltipFooterItems">
                      <code>num</code>, <code>number</code>, <code>index</code>, or <code>i</code>
                    </span>
                  </div>
                </div>
              }
            />
            <div className="registerFormulaActions">
              <Button size="sm" className="registerActionBtn" onClick={applyFormula}>
                Apply
              </Button>
            </div>
          </div>
          <div className="registerFormulaHint">
            Use variables:{" "}
            <span className="registerFormulaHintItems">
              <code>num</code>, <code>number</code>, <code>index</code>, or <code>i</code>
            </span>
            .
          </div>
        </>
      )}

      <div className="registerTableToolbar">
        {isEditing && (
          <Button size="sm" className="registerClearToggle registerActionBtn" onClick={resetAll}>
            <Trash2 size={14} aria-hidden="true" />
            Clear Values
          </Button>
        )}
        <GuidedTourTooltip
          open={showEditRegistersTourStep}
          step={3}
          totalSteps={8}
          align="end"
          title="Edit Register Values"
          description="Edit the starting register values before you run the program."
          onBack={onBackEditRegistersTourStep}
          onNext={onNextEditRegistersTourStep}
          onSkip={onDismissTour}
          onClose={onDismissTour}
        >
          <Button
            size="sm"
            className="registerEditToggle registerActionBtn"
            onClick={toggleEditMode}
            disabled={isRuntimeLocked}
          >
            {isEditing ? <Check size={14} aria-hidden="true" /> : <Edit size={14} aria-hidden="true" />}
            {isEditing ? "Done Editing" : "Edit Registers"}
          </Button>
        </GuidedTourTooltip>
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
              <div
                className={`registerRow${recentlyChangedAliases[row.alias] ? " registerRowChanged" : ""}`}
                role="row"
                key={row.key}
              >
                <div className="registerName" role="cell">{`$${row.alias}`}</div>
                <div className="registerNum" role="cell">{`${row.num}`}</div>
                <input
                  className={`registerValueInput${isEditing && row.alias !== "zero" ? " registerValueInputEditable" : ""}`}
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
