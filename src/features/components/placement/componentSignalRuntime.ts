import type { HoverSignalKey } from "@/features/pipelineCanvas/pipelineHoverMap";
import type { PlacedComponent } from "./usePendingComponentPlacement";
import { getComponentValuePreview } from "./componentValueModel";

export const SUPPORTED_COMPONENT_SIGNAL_KEYS = new Set<HoverSignalKey>([
  "rsValue",
  "rtValue",
  "aluResult",
  "memoryAddress",
  "memoryWriteData",
  "memoryReadData",
  "writeBackValue",
]);

export type ActiveSignalComponent = {
  componentLabel: string;
  signalKey: HoverSignalKey;
} | null;

export function canAttachComponentToSignal(signalKey: HoverSignalKey | null | undefined) {
  return signalKey ? SUPPORTED_COMPONENT_SIGNAL_KEYS.has(signalKey) : false;
}

export function getActiveSignalComponent(placedComponents: PlacedComponent[]): ActiveSignalComponent {
  const placedComponent = placedComponents[0];
  if (!placedComponent?.signalKey || !canAttachComponentToSignal(placedComponent.signalKey)) {
    return null;
  }

  return {
    componentLabel: placedComponent.label,
    signalKey: placedComponent.signalKey,
  };
}

export function applySignalComponentToNumber(
  activeComponent: ActiveSignalComponent,
  signalKey: HoverSignalKey,
  value: number | null,
): number | null {
  if (!activeComponent || activeComponent.signalKey !== signalKey || value === null) {
    return value;
  }

  const preview = getComponentValuePreview(activeComponent.componentLabel, String(value >>> 0));
  if (!preview) {
    return value;
  }

  return Number.parseInt(preview.afterHex.slice(2), 16) >>> 0;
}

export function applySignalComponentToHex(
  activeComponent: ActiveSignalComponent,
  signalKey: HoverSignalKey,
  value: string | undefined,
): string | undefined {
  if (!activeComponent || activeComponent.signalKey !== signalKey || !value) {
    return value;
  }

  return getComponentValuePreview(activeComponent.componentLabel, value)?.afterHex ?? value;
}
