import type { MemoryRuleConfig, WriteMode } from "@/app/store/appStore";
import type { ModalField } from "@/ui/components";
import { notifyAppError } from "@/app/errors/appError";
import { Button, GuidedTourTooltip, Modal, Tooltip } from "@/ui/components";
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateMemoryFormula, parseSignedOrUnsigned32, parseWordNumber, toHex32 } from "./memoryEditorModel";
import "./memoryEditor.css";

type Props = {
  rules: MemoryRuleConfig[];
  onRulesChange: (rules: MemoryRuleConfig[]) => void;
  onNotifyError: (message: string) => void;
  runtimeMemoryWords: Map<number, number>;
  runtimeChangedWords: number[];
  isRuntimeLocked: boolean;
  showAddRulesTourStep: boolean;
  onBackAddRulesTourStep: () => void;
  onNextAddRulesTourStep: () => void;
  showRuntimeMemoryTourStep: boolean;
  onBackRuntimeMemoryTourStep: () => void;
  onNextRuntimeMemoryTourStep: () => void;
  onDismissTour: () => void;
};

const ADD_RULE_FIELDS: ModalField[] = [
  {
    id: "writeMode",
    type: "select",
    label: "Write Mode",
    defaultValue: "word",
    fieldClassName: "modalField-full",
    options: [
      { value: "word", label: "Word Write" },
      { value: "byte", label: "Byte Write" },
    ],
  },
  {
    id: "start",
    type: "text",
    label: "Start",
    defaultValue: "",
    placeholder: "0x0000",
    helperText: "Index for word mode, address for byte mode.",
    fieldClassName: "modalField-half",
    visibleWhen: (values) => values.fullRange !== "true",
  },
  {
    type: "text",
    id: "end",
    label: "Stop",
    defaultValue: "",
    placeholder: "0xFFFF",
    helperText: "Inclusive stop index/address.",
    fieldClassName: "modalField-half",
    visibleWhen: (values) => values.fullRange !== "true",
  },
  {
    id: "fullRange",
    type: "checkbox",
    label: "Use full range",
    defaultChecked: false,
    fieldClassName: "modalField-full",
  },
  {
    id: "value",
    type: "text",
    label: "Value",
    defaultValue: "",
    placeholder: "Enter value",
    helperText: "Decimal or hex (e.g. 42 or 0x2A).",
    fieldClassName: "modalField-value",
    visibleWhen: (values) => values.useFormula !== "true",
  },
  {
    id: "formula",
    type: "text",
    label: "Formula",
    defaultValue: "",
    placeholder: "index * 4",
    helperText: "Variables: index, word, i, address, addr.",
    fieldClassName: "modalField-value",
    visibleWhen: (values) => values.useFormula === "true",
  },
  {
    id: "useFormula",
    type: "checkbox",
    label: "Use formula",
    defaultChecked: false,
    fieldClassName: "modalField-toggle",
  },
];

export default function MemoryEditor({
  rules,
  onRulesChange,
  onNotifyError,
  runtimeMemoryWords,
  runtimeChangedWords,
  isRuntimeLocked,
  showAddRulesTourStep,
  onBackAddRulesTourStep,
  onNextAddRulesTourStep,
  showRuntimeMemoryTourStep,
  onBackRuntimeMemoryTourStep,
  onNextRuntimeMemoryTourStep,
  onDismissTour,
}: Props) {
  const overlayInset = 12;
  const toHexCompact = (value: number) => `0x${(value >>> 0).toString(16).toUpperCase()}`;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [isRulesExpanded, setIsRulesExpanded] = useState(true);
  const [isRulesScrollbarVisible, setIsRulesScrollbarVisible] = useState(false);
  const [rulesScrollbarThumbTop, setRulesScrollbarThumbTop] = useState(0);
  const [rulesScrollbarThumbHeight, setRulesScrollbarThumbHeight] = useState(0);
  const [hasRulesOverflow, setHasRulesOverflow] = useState(false);
  const [recentlyChangedWords, setRecentlyChangedWords] = useState<Record<number, true>>({});
  const [watchedWords, setWatchedWords] = useState<number[]>([]);
  const [isRuntimeScrollbarVisible, setIsRuntimeScrollbarVisible] = useState(false);
  const [runtimeScrollbarThumbTop, setRuntimeScrollbarThumbTop] = useState(0);
  const [runtimeScrollbarThumbHeight, setRuntimeScrollbarThumbHeight] = useState(0);
  const [hasRuntimeOverflow, setHasRuntimeOverflow] = useState(false);
  const rulesListRef = useRef<HTMLDivElement | null>(null);
  const runtimeListRef = useRef<HTMLDivElement | null>(null);
  const highlightTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const readWord = (words: Map<number, number>, wordIndex: number) => (words.get(wordIndex) ?? 0) >>> 0;

  const updateRuntimeOverlayScrollbar = () => {
    const listEl = runtimeListRef.current;
    if (!listEl) return;

    const { scrollTop, scrollHeight, clientHeight } = listEl;
    const hasOverflow = scrollHeight > clientHeight + 1;
    setHasRuntimeOverflow(hasOverflow);

    if (!hasOverflow) {
      setRuntimeScrollbarThumbTop(0);
      setRuntimeScrollbarThumbHeight(0);
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

    setRuntimeScrollbarThumbHeight(thumbHeight);
    setRuntimeScrollbarThumbTop(thumbTop);
  };

  const updateRulesOverlayScrollbar = () => {
    const listEl = rulesListRef.current;
    if (!listEl) return;

    const { scrollTop, scrollHeight, clientHeight } = listEl;
    const hasOverflow = scrollHeight > clientHeight + 1;
    setHasRulesOverflow(hasOverflow);

    if (!hasOverflow) {
      setRulesScrollbarThumbTop(0);
      setRulesScrollbarThumbHeight(0);
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

    setRulesScrollbarThumbHeight(thumbHeight);
    setRulesScrollbarThumbTop(thumbTop);
  };

  useEffect(() => {
    if (runtimeChangedWords.length === 0) {
      return;
    }
    setRecentlyChangedWords((prev) => {
      const next = { ...prev };
      for (const word of runtimeChangedWords) {
        next[word] = true;
      }
      return next;
    });

    setWatchedWords((prev) => {
      const next = [...prev];
      for (const word of runtimeChangedWords) {
        if (!next.includes(word)) {
          next.unshift(word);
        }
      }
      return next.slice(0, 24);
    });

    for (const word of runtimeChangedWords) {
      const existing = highlightTimeoutsRef.current[word];
      if (existing) {
        clearTimeout(existing);
      }
      highlightTimeoutsRef.current[word] = setTimeout(() => {
        setRecentlyChangedWords((prev) => {
          const next = { ...prev };
          delete next[word];
          return next;
        });
        delete highlightTimeoutsRef.current[word];
      }, 1200);
    }
  }, [runtimeChangedWords]);

  useEffect(() => {
    if (watchedWords.length > 0) {
      return;
    }

    const initialNonZero = Array.from(runtimeMemoryWords.keys())
      .sort((a, b) => a - b)
      .slice(0, 24);

    if (initialNonZero.length > 0) {
      setWatchedWords(initialNonZero);
    }
  }, [runtimeMemoryWords, watchedWords.length]);

  useEffect(() => {
    updateRulesOverlayScrollbar();

    const listEl = rulesListRef.current;
    if (!listEl) return;

    const resizeObserver = new ResizeObserver(() => updateRulesOverlayScrollbar());
    resizeObserver.observe(listEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isRulesExpanded, rules]);

  useEffect(() => {
    updateRuntimeOverlayScrollbar();

    const listEl = runtimeListRef.current;
    if (!listEl) return;

    const resizeObserver = new ResizeObserver(() => updateRuntimeOverlayScrollbar());
    resizeObserver.observe(listEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [recentlyChangedWords, runtimeMemoryWords, watchedWords]);

  useEffect(
    () => () => {
      for (const timeout of Object.values(highlightTimeoutsRef.current)) {
        clearTimeout(timeout);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isRuntimeLocked) {
      return;
    }
    setIsAddModalOpen(false);
    setEditingRuleId(null);
    setRecentlyChangedWords({});
    setWatchedWords([]);
  }, [isRuntimeLocked]);

  const runtimeRows = useMemo(() => {
    return watchedWords.map((wordIndex) => {
      return {
        wordIndex,
        address: wordIndex * 4,
        value: readWord(runtimeMemoryWords, wordIndex),
        changed: Boolean(recentlyChangedWords[wordIndex]),
      };
    });
  }, [recentlyChangedWords, runtimeMemoryWords, watchedWords]);

  const renderAddressViews = (rule: MemoryRuleConfig) => {
    if (rule.fullRange) {
      return (
        <>
          <strong>Address:</strong> Full range
        </>
      );
    }
    return (
      <>
        <strong>Address: </strong> {rule.start} - {rule.end} | {toHexCompact(rule.start)} - {toHexCompact(rule.end)}
      </>
    );
  };

  const formatRuleSummary = (rule: MemoryRuleConfig) => {
    const rangeLabel = rule.fullRange
      ? "Full range"
      : `${toHexCompact(rule.start)} - ${toHexCompact(rule.end)}`;
    const valueLabel = rule.useFormula
      ? `Formula: ${rule.formulaText}`
      : `Value: ${toHexCompact(parseSignedOrUnsigned32(rule.valueText, "Value"))}`;
    return `${rangeLabel} | ${valueLabel}`;
  };

  const formatWriteModeLabel = (rule: MemoryRuleConfig) =>
    rule.writeMode === "byte" ? "Byte Write" : "Word Write";

  const buildRuleFromModal = (rawValues: Record<string, string>, existingId?: string): MemoryRuleConfig => {
    const fullRange = (rawValues.fullRange ?? "false") === "true";
    const writeModeRaw = (rawValues.writeMode ?? "").trim();
    if (writeModeRaw !== "word" && writeModeRaw !== "byte") {
      throw new Error("Write mode is required");
    }
    const writeMode = writeModeRaw as WriteMode;
    const useFormula = (rawValues.useFormula ?? "false") === "true";
    const startRaw = rawValues.start ?? "0";
    const endRaw = rawValues.end ?? "0";
    const valueRaw = rawValues.value ?? "0";
    const formulaRaw = rawValues.formula ?? "";
    const start = fullRange ? 0 : parseWordNumber(startRaw, "Start");
    const end = fullRange ? 0 : parseWordNumber(endRaw, "End");
    const formulaText = formulaRaw.trim();
    const valueText = valueRaw.trim() || "0";

    if (!fullRange && end < start) {
      throw new Error("End must be greater than or equal to start");
    }

    let resolvedValue = 0;
    if (useFormula) {
      if (!formulaText) {
        throw new Error("Formula is required");
      }
      resolvedValue = evaluateMemoryFormula(formulaText, start);
    } else {
      resolvedValue = parseSignedOrUnsigned32(valueText, "Value");
    }

    return {
      id: existingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: "range_fill",
      writeMode,
      fullRange,
      useFormula,
      startRaw,
      endRaw,
      valueRaw,
      formulaRaw,
      start,
      end,
      valueText,
      formulaText,
      wordHex: toHex32(resolvedValue),
      byteHex: `0x${(resolvedValue & 0xff).toString(16).toUpperCase().padStart(2, "0")}`,
    };
  };

  const addRuleFromModal = (rawValues: Record<string, string>) => {
    const rule = buildRuleFromModal(rawValues);
    onRulesChange([...rules, rule]);
    setIsAddModalOpen(false);
    setEditingRuleId(null);
  };

  const updateRuleFromModal = (rawValues: Record<string, string>, ruleId: string) => {
    const updated = buildRuleFromModal(rawValues, ruleId);
    onRulesChange(rules.map((rule) => (rule.id === ruleId ? updated : rule)));
    setIsAddModalOpen(false);
    setEditingRuleId(null);
  };

  const removeRule = (ruleId: string) => {
    onRulesChange(rules.filter((rule) => rule.id !== ruleId));
  };

  const clearRules = () => {
    onRulesChange([]);
  };

  const editingRule = editingRuleId ? rules.find((rule) => rule.id === editingRuleId) ?? null : null;
  const modalInitialValues = editingRule
    ? {
        fullRange: editingRule.fullRange ? "true" : "false",
        writeMode: editingRule.writeMode,
        useFormula: editingRule.useFormula ? "true" : "false",
        start: editingRule.startRaw,
        end: editingRule.endRaw,
        value: editingRule.valueRaw,
        formula: editingRule.formulaRaw,
      }
    : undefined;

  return (
    <div className="memoryEditor">
      <div className="memoryTableToolbar">
        <GuidedTourTooltip
          open={showAddRulesTourStep}
          step={4}
          totalSteps={8}
          align="start"
          fullWidth
          title="Add Memory Rules"
          description="Use rules to prefill memory before execution starts."
          onBack={onBackAddRulesTourStep}
          onNext={onNextAddRulesTourStep}
          onSkip={onDismissTour}
          onClose={onDismissTour}
        >
          <Button
            size="sm"
            className="memoryActionBtn memoryAddBtn"
            onClick={() => setIsAddModalOpen(true)}
            disabled={isRuntimeLocked}
          >
            <Plus size={14} aria-hidden="true" />
            Add Rule
          </Button>
        </GuidedTourTooltip>
        <Button
          size="sm"
          className="memoryActionBtn memoryClearBtn"
          onClick={clearRules}
          disabled={isRuntimeLocked || rules.length === 0}
        >
          <Trash2 size={14} aria-hidden="true" />
          Clear Rules
        </Button>
      </div>

      <div className="memoryRulesHeaderRow">
        <div className="memoryRulesHeaderCluster">
          <button
            type="button"
            className="memoryRulesLabelButton"
            aria-expanded={isRulesExpanded}
            aria-controls="memory-rules-list"
            onClick={() => setIsRulesExpanded((prev) => !prev)}
          >
            <span className="memoryRulesHeader">Rules ({rules.length})</span>
          </button>
          <Tooltip
            className="memoryRulesInfoTooltip"
            ariaLabel="About memory rules"
            align="end"
            content={
              <div className="memoryRulesTooltipPanel">
                <div className="memoryRulesTooltipTitle">About Rules</div>
                <div className="memoryRulesTooltipText">
                  Rules initialize runtime memory when you press Run.
                </div>
                <div className="memoryRulesTooltipFooter">
                  Click <code>Add Rule</code> to create your first rule.
                </div>
              </div>
            }
          />
        </div>
        <button
          type="button"
          className="memoryRulesChevronButton"
          aria-expanded={isRulesExpanded}
          aria-controls="memory-rules-list"
          aria-label={isRulesExpanded ? "Collapse memory rules" : "Expand memory rules"}
          onClick={() => setIsRulesExpanded((prev) => !prev)}
        >
          <span className="memoryRulesChevron" aria-hidden="true">
            <ChevronDown size={18} />
          </span>
        </button>
      </div>
      {isRulesExpanded && (
        <div
          className="memoryRulesListWrap"
          onMouseEnter={() => setIsRulesScrollbarVisible(true)}
          onMouseLeave={() => setIsRulesScrollbarVisible(false)}
        >
          <div
            ref={rulesListRef}
            className="memoryRulesList"
            id="memory-rules-list"
            onScroll={updateRulesOverlayScrollbar}
          >
            {rules.length === 0 && <div className="memoryRulesEmpty">No rules yet. Click Add Rule.</div>}
            {rules.map((rule, idx) => (
              <div className="memoryRuleItem" key={rule.id}>
                <div className="memoryRuleHead">
                  <div className="memoryRuleMain">
                    <div className="memoryRuleTitle">{formatWriteModeLabel(rule)}</div>
                    <div className="memoryRuleSummary">{formatRuleSummary(rule)}</div>
                  </div>
                  <div className="memoryRuleActions">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="memoryRuleEdit"
                      disabled={isRuntimeLocked}
                      onClick={() => {
                        setEditingRuleId(rule.id);
                        setIsAddModalOpen(true);
                      }}
                      aria-label={`Edit rule ${idx + 1}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="memoryRuleDelete"
                      disabled={isRuntimeLocked}
                      onClick={() => removeRule(rule.id)}
                      aria-label={`Remove rule ${idx + 1}`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                <div className="memoryRuleDetails">
                  <div className="memoryRuleMeta">{renderAddressViews(rule)}</div>
                  <div className="memoryRuleValueLine">
                    {rule.useFormula
                      ? `Value ${rule.wordHex}`
                      : `Value ${toHexCompact(parseSignedOrUnsigned32(rule.valueText, "Value"))}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            className={`memoryRulesOverlayScrollbar${isRulesScrollbarVisible && hasRulesOverflow ? " isVisible" : ""}`}
            aria-hidden="true"
          >
            <div
              className="memoryRulesOverlayThumb"
              style={{
                height: `${rulesScrollbarThumbHeight}px`,
                transform: `translateY(${rulesScrollbarThumbTop}px)`,
              }}
            />
          </div>
        </div>
      )}

      <div className="memorySectionDivider" aria-hidden="true" />

      <div className="memoryRuntimeHeaderRowWrap">
        <div className="memoryRuntimeHeader">Runtime Memory</div>
        <Tooltip
          className="memoryRuntimeInfoTooltip"
          ariaLabel="About runtime memory"
          align="end"
          content={
            <div className="memoryRuntimeTooltipPanel">
              <div className="memoryRuntimeTooltipTitle">Runtime Memory</div>
              <div className="memoryRuntimeTooltipText">
                Shows live memory values during program execution.
              </div>
              <div className="memoryRuntimeTooltipList">
                <div className="memoryRuntimeTooltipCard">
                  <code>Word</code>
                  <div className="memoryRuntimeTooltipDescription">
                    Memory index or identifier
                  </div>
                </div>
                <div className="memoryRuntimeTooltipCard">
                  <code>Address</code>
                  <div className="memoryRuntimeTooltipDescription">Memory location (hex)</div>
                </div>
                <div className="memoryRuntimeTooltipCard">
                  <code>Value</code>
                  <div className="memoryRuntimeTooltipDescription">Current data stored</div>
                </div>
              </div>
              <div className="memoryRuntimeTooltipFooter">
                Press <code>Run</code> and <code>Step</code> to populate values.
              </div>
            </div>
          }
        />
      </div>
      <div className="memoryRuntimeList" role="table" aria-label="Runtime memory words">
        <GuidedTourTooltip
          open={showRuntimeMemoryTourStep}
          step={7}
          totalSteps={8}
          align="start"
          className="memoryRuntimeTableTour"
          title="Inspect Runtime Memory"
          description="This table shows the memory values that change during execution."
          onBack={onBackRuntimeMemoryTourStep}
          onNext={onNextRuntimeMemoryTourStep}
          onSkip={onDismissTour}
          onClose={onDismissTour}
        >
          <span className="memoryRuntimeTableTourAnchor" aria-hidden="true" />
        </GuidedTourTooltip>
        <div className="memoryRuntimeHeaderRow" role="row">
          <div className="memoryRuntimeHeaderCell" role="columnheader">
            Word
          </div>
          <div className="memoryRuntimeHeaderCell" role="columnheader">
            Address
          </div>
          <div className="memoryRuntimeHeaderCell" role="columnheader">
            Value
          </div>
        </div>
        <div
          className="memoryRuntimeBodyWrap"
          onMouseEnter={() => setIsRuntimeScrollbarVisible(true)}
          onMouseLeave={() => setIsRuntimeScrollbarVisible(false)}
        >
          <div
            ref={runtimeListRef}
            className="memoryRuntimeBody"
            onScroll={updateRuntimeOverlayScrollbar}
          >
            {runtimeRows.length === 0 && (
              <div className="memoryRulesEmpty">No runtime updates yet. Run and step to populate values.</div>
            )}
            {runtimeRows.map((row) => (
              <div
                key={row.wordIndex}
                className={`memoryRuntimeRow${row.changed ? " memoryRuntimeRowChanged" : ""}`}
                role="row"
              >
                <div className="memoryRuntimeCell memoryRuntimeCellWord" role="cell">
                  W[{row.wordIndex}]
                </div>
                <div className="memoryRuntimeCell memoryRuntimeCellAddress" role="cell">
                  {toHex32(row.address)}
                </div>
                <div className="memoryRuntimeCell memoryRuntimeCellValue" role="cell">
                  {toHex32(row.value)}
                </div>
              </div>
            ))}
          </div>
          <div
            className={`memoryOverlayScrollbar${isRuntimeScrollbarVisible && hasRuntimeOverflow ? " isVisible" : ""}`}
            aria-hidden="true"
          >
            <div
              className="memoryOverlayThumb"
              style={{
                height: `${runtimeScrollbarThumbHeight}px`,
                transform: `translateY(${runtimeScrollbarThumbTop}px)`,
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        open={isAddModalOpen && !isRuntimeLocked}
        title="Memory Rule"
        className="memoryRuleModal"
        variant="form"
        typeLabel=""
        fields={ADD_RULE_FIELDS}
        initialValues={modalInitialValues}
        submitLabel="Save"
        cancelLabel="Cancel"
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRuleId(null);
        }}
        onSubmit={({ values }) => {
          if (isRuntimeLocked) {
            return;
          }
          try {
            if (editingRuleId) {
              updateRuleFromModal(values, editingRuleId);
              return;
            }
            addRuleFromModal(values);
          } catch (err) {
            notifyAppError(onNotifyError, err, "memory", "Failed to save memory rule");
          }
        }}
      />
    </div>
  );
}
