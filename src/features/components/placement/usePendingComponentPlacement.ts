import { useCallback, useState } from "react";

export type PlacedComponent = {
  id: number;
  label: string;
  pathId: string;
  x: number;
  y: number;
};

type PlacementPoint = {
  pathId: string;
  x: number;
  y: number;
};

export function usePendingComponentPlacement() {
  const [pendingComponentLabel, setPendingComponentLabel] = useState<string | null>(null);
  const [placedComponents, setPlacedComponents] = useState<PlacedComponent[]>([]);

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
