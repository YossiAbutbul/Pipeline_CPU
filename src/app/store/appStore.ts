import { useEffect, useState } from "react";
import { createDefaultRegisterValues } from "@/features/statePanels/registerEditorModel";

export type TabKey = "registers" | "memory";
export type WriteMode = "word" | "byte";

export type MemoryRuleConfig = {
  id: string;
  kind: "range_fill";
  writeMode: WriteMode;
  fullRange: boolean;
  useFormula: boolean;
  startRaw: string;
  endRaw: string;
  valueRaw: string;
  formulaRaw: string;
  start: number;
  end: number;
  valueText: string;
  formulaText: string;
  wordHex: string;
  byteHex: string;
};

export type AppState = {
  program: string;
  initialPc: string;
  statePanelTab: TabKey;
  registers: {
    formula: string;
    isEditing: boolean;
    values: Record<string, string>;
  };
  memory: {
    rules: MemoryRuleConfig[];
  };
};

export const DEFAULT_PROGRAM = "# Write MIPS here...\nadd $1, $2, $3\n";
export const DEFAULT_INITIAL_PC = "0x00400000";

const STORAGE_KEY = "pipeline-cpu.app-state";
const STORAGE_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeMemoryRules(raw: unknown): MemoryRuleConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(isRecord)
    .filter((rule) => typeof rule.id === "string" && rule.kind === "range_fill")
    .map((rule) => ({
      id: String(rule.id),
      kind: "range_fill" as const,
      writeMode: rule.writeMode === "byte" ? "byte" : "word",
      fullRange: Boolean(rule.fullRange),
      useFormula: Boolean(rule.useFormula),
      startRaw: typeof rule.startRaw === "string" ? rule.startRaw : "0x0000",
      endRaw: typeof rule.endRaw === "string" ? rule.endRaw : "0xFFFF",
      valueRaw: typeof rule.valueRaw === "string" ? rule.valueRaw : "",
      formulaRaw: typeof rule.formulaRaw === "string" ? rule.formulaRaw : "",
      start: Number.isInteger(rule.start) ? Number(rule.start) : 0,
      end: Number.isInteger(rule.end) ? Number(rule.end) : 0,
      valueText: typeof rule.valueText === "string" ? rule.valueText : "0",
      formulaText: typeof rule.formulaText === "string" ? rule.formulaText : "",
      wordHex: typeof rule.wordHex === "string" ? rule.wordHex : "0x00000000",
      byteHex: typeof rule.byteHex === "string" ? rule.byteHex : "0x00",
    }));
}

function sanitizeRegisterValues(raw: unknown): Record<string, string> {
  const defaults = createDefaultRegisterValues();
  if (!isRecord(raw)) {
    return defaults;
  }

  const next = { ...defaults };
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      next[key] = value;
    }
  }
  next.zero = "0x00000000";
  return next;
}

export function createDefaultAppState(): AppState {
  return {
    program: DEFAULT_PROGRAM,
    initialPc: DEFAULT_INITIAL_PC,
    statePanelTab: "registers",
    registers: {
      formula: "num * 0x200",
      isEditing: false,
      values: createDefaultRegisterValues(),
    },
    memory: {
      rules: [],
    },
  };
}

export function loadPersistedAppState(): AppState {
  const defaults = createDefaultAppState();
  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION || !isRecord(parsed.state)) {
      return defaults;
    }

    const state = parsed.state;
    return {
      program: typeof state.program === "string" ? state.program : defaults.program,
      initialPc: typeof state.initialPc === "string" ? state.initialPc : defaults.initialPc,
      statePanelTab: state.statePanelTab === "memory" ? "memory" : "registers",
      registers: {
        formula: isRecord(state.registers) && typeof state.registers.formula === "string"
          ? state.registers.formula
          : defaults.registers.formula,
        isEditing: isRecord(state.registers) ? Boolean(state.registers.isEditing) : defaults.registers.isEditing,
        values: sanitizeRegisterValues(isRecord(state.registers) ? state.registers.values : undefined),
      },
      memory: {
        rules: sanitizeMemoryRules(isRecord(state.memory) ? state.memory.rules : undefined),
      },
    };
  } catch {
    return defaults;
  }
}

export function usePersistedAppState() {
  const [state, setState] = useState<AppState>(() => loadPersistedAppState());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: STORAGE_VERSION,
        state,
      }),
    );
  }, [state]);

  return [state, setState] as const;
}

export function clearPersistedAppState() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
