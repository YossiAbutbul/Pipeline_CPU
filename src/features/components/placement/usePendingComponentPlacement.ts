import { useCallback, useEffect, useState } from "react";
import { PATH_SIGNAL_MAP, type HoverSignalKey } from "@/features/pipelineCanvas/pipelineHoverMap";

const PLACED_COMPONENTS_STORAGE_KEY = "pipelineCpu.placedComponents";

export type PlacedComponent = {
  id: number;
  label: string;
  pathId: string;
  signalKey: HoverSignalKey | null;
  x: number;
  y: number;
};

function readPersistedPlacedComponents(): PlacedComponent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(PLACED_COMPONENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((component) => {
      if (
        !component ||
        typeof component !== "object" ||
        typeof component.id !== "number" ||
        typeof component.label !== "string" ||
        typeof component.pathId !== "string" ||
        typeof component.x !== "number" ||
        typeof component.y !== "number"
      ) {
        return [];
      }

      return [
        {
          id: component.id,
          label: component.label,
          pathId: component.pathId,
          // Re-resolve from the current path map so persisted components survive signal-map refactors.
          signalKey: PATH_SIGNAL_MAP[component.pathId]?.key ?? null,
          x: component.x,
          y: component.y,
        } satisfies PlacedComponent,
      ];
    });
  } catch {
    return [];
  }
}

type PlacementPoint = {
  pathId: string;
  x: number;
  y: number;
};

export function usePendingComponentPlacement() {
  const [pendingComponentLabel, setPendingComponentLabel] = useState<string | null>(null);
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>(() => readPersistedPlacedComponents());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (placedComponents.length === 0) {
      window.localStorage.removeItem(PLACED_COMPONENTS_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(PLACED_COMPONENTS_STORAGE_KEY, JSON.stringify(placedComponents));
  }, [placedComponents]);

  const beginComponentPlacement = useCallback((label: string) => {
    setPendingComponentLabel(label);
  }, []);

  const cancelComponentPlacement = useCallback(() => {
    setPendingComponentLabel(null);
  }, []);

  const placePendingComponent = useCallback(
    (placement: PlacementPoint) => {
      if (!pendingComponentLabel) {
        return;
      }

      setPlacedComponents([
        {
          id: Date.now() + Math.floor(Math.random() * 1000),
          label: pendingComponentLabel,
          pathId: placement.pathId,
          signalKey: PATH_SIGNAL_MAP[placement.pathId]?.key ?? null,
          x: placement.x,
          y: placement.y,
        },
      ]);
      setPendingComponentLabel(null);
    },
    [pendingComponentLabel],
  );

  const deletePlacedComponent = useCallback((componentId: number) => {
    setPlacedComponents((current) => current.filter((component) => component.id !== componentId));
  }, []);

  const resetComponentPlacement = useCallback(() => {
    setPendingComponentLabel(null);
    setPlacedComponents([]);
  }, []);

  return {
    pendingComponentLabel,
    placedComponents,
    beginComponentPlacement,
    cancelComponentPlacement,
    placePendingComponent,
    deletePlacedComponent,
    resetComponentPlacement,
  };
}
