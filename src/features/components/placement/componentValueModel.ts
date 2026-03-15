function parseUnsigned32(rawValue: string): number | null {
  const normalized = rawValue.trim();
  if (!normalized) {
    return null;
  }

  if (/^0x[0-9a-f]+$/i.test(normalized)) {
    const parsed = Number.parseInt(normalized.slice(2), 16);
    return Number.isNaN(parsed) ? null : parsed >>> 0;
  }

  if (/^-?\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed >>> 0;
  }

  return null;
}

function formatUnsigned32(value: number) {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

function toSigned32(value: number) {
  return value >> 0;
}

function parseShiftLabel(label: string) {
  const match = /^(SLL|SLR|SAR)\s+(\d+)$/i.exec(label.trim());
  if (!match) {
    return null;
  }

  return {
    opcode: match[1].toUpperCase() as "SLL" | "SLR" | "SAR",
    amount: Number.parseInt(match[2], 10),
  };
}

export type ComponentValuePreview = {
  componentLabel: string;
  beforeHex: string;
  afterHex: string;
};

export function getComponentValuePreview(componentLabel: string, rawValue: string): ComponentValuePreview | null {
  const inputValue = parseUnsigned32(rawValue);
  if (inputValue === null) {
    return null;
  }

  let outputValue: number | null = null;
  const normalizedLabel = componentLabel.trim().toUpperCase();

  if (normalizedLabel === "NOT") {
    outputValue = (~inputValue) >>> 0;
  } else if (normalizedLabel === "NEG") {
    outputValue = (-toSigned32(inputValue)) >>> 0;
  } else {
    const shift = parseShiftLabel(normalizedLabel);
    if (!shift) {
      return null;
    }

    if (shift.opcode === "SLL") {
      outputValue = (inputValue << shift.amount) >>> 0;
    } else if (shift.opcode === "SLR") {
      outputValue = inputValue >>> shift.amount;
    } else {
      outputValue = (toSigned32(inputValue) >> shift.amount) >>> 0;
    }
  }

  return {
    componentLabel: normalizedLabel,
    beforeHex: formatUnsigned32(inputValue),
    afterHex: formatUnsigned32(outputValue),
  };
}
