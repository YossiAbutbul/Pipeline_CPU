import type { MemoryRuleConfig, WriteMode } from "@/app/store/appStore";
import type { ModalField } from "@/ui/components";
import { Button, Modal, Tooltip } from "@/ui/components";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { evaluateMemoryFormula, parseSignedOrUnsigned32, parseWordNumber, toHex32 } from "./memoryEditorModel";
import "./memoryEditor.css";

type Props = {
  rules: MemoryRuleConfig[];
  onRulesChange: (rules: MemoryRuleConfig[]) => void;
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
    defaultValue: "0x0000",
    placeholder: "0x0000",
    helperText: "Index for word mode, address for byte mode.",
    fieldClassName: "modalField-half",
    visibleWhen: (values) => values.fullRange !== "true",
  },
  {
    type: "text",
    id: "end",
    label: "Stop",
    defaultValue: "0xFFFF",
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

export default function MemoryEditor({ rules, onRulesChange }: Props) {
  const toHexCompact = (value: number) => `0x${(value >>> 0).toString(16).toUpperCase()}`;

  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const formatAddressViews = (rule: MemoryRuleConfig) => {
    if (rule.fullRange) {
      return "Address Full range";
    }
    return `Address ${rule.start} - ${rule.end} | ${toHexCompact(rule.start)} - ${toHexCompact(rule.end)}`;
  };

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
    setError(null);
    setIsAddModalOpen(false);
    setEditingRuleId(null);
  };

  const updateRuleFromModal = (rawValues: Record<string, string>, ruleId: string) => {
    const updated = buildRuleFromModal(rawValues, ruleId);
    onRulesChange(rules.map((rule) => (rule.id === ruleId ? updated : rule)));
    setError(null);
    setIsAddModalOpen(false);
    setEditingRuleId(null);
  };

  const removeRule = (ruleId: string) => {
    onRulesChange(rules.filter((rule) => rule.id !== ruleId));
  };

  const clearRules = () => {
    onRulesChange([]);
    setError(null);
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
        <Button size="sm" className="memoryActionBtn memoryAddBtn" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={14} aria-hidden="true" />
          Add Rule
        </Button>
        <Button size="sm" className="memoryActionBtn memoryClearBtn" onClick={clearRules} disabled={rules.length === 0}>
          <Trash2 size={14} aria-hidden="true" />
          Clear Rules
        </Button>
      </div>

      {error && (
        <div className="memoryErrorRow">
          <Tooltip
            variant="error"
            ariaLabel="Memory rule error details"
            align="start"
            showTrigger={false}
            open
            dismissible
            autoDismissMs={2800}
            onDismiss={() => setError(null)}
            content={error}
          />
        </div>
      )}

      <div className="memoryRulesHeader">Rules ({rules.length})</div>
      <div className="memoryRulesList">
        {rules.length === 0 && <div className="memoryRulesEmpty">No rules yet. Click Add Rule.</div>}
        {rules.map((rule, idx) => (
          <div className="memoryRuleItem" key={rule.id}>
            <div className="memoryRuleHead">
              <div className="memoryRuleTitle">
                {rule.writeMode === "word" ? "Word Write" : "Byte Write"}
                {rule.useFormula ? " Formula" : ""}
              </div>
              <div className="memoryRuleActions">
                <Button
                  size="sm"
                  variant="ghost"
                  className="memoryRuleEdit"
                  onClick={() => {
                    setEditingRuleId(rule.id);
                    setIsAddModalOpen(true);
                  }}
                  aria-label={`Edit rule ${idx + 1}`}
                >
                  <Pencil size={12} aria-hidden="true" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="memoryRuleDelete"
                  onClick={() => removeRule(rule.id)}
                  aria-label={`Remove rule ${idx + 1}`}
                >
                  <Trash2 size={12} aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="memoryRuleMeta">{formatAddressViews(rule)}</div>
            <div className="memoryRuleValueLine">
              {rule.useFormula
                ? `Value formula ${rule.formulaText}`
                : `Value ${toHexCompact(parseSignedOrUnsigned32(rule.valueText, "Value"))}`}
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={isAddModalOpen}
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
          try {
            if (editingRuleId) {
              updateRuleFromModal(values, editingRuleId);
              return;
            }
            addRuleFromModal(values);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        }}
      />
    </div>
  );
}
