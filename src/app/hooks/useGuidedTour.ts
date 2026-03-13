import { useCallback, useState } from "react";

const GUIDED_TOUR_STORAGE_KEY = "pipeline-cpu.guided-tour-completed";

function loadInitialGuidedTourStep() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(GUIDED_TOUR_STORAGE_KEY) === "true" ? null : 0;
}

export function useGuidedTour(totalSteps: number) {
  const [guidedTourStep, setGuidedTourStep] = useState<number | null>(() => loadInitialGuidedTourStep());

  const completeGuidedTour = useCallback(() => {
    setGuidedTourStep(null);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(GUIDED_TOUR_STORAGE_KEY, "true");
    }
  }, []);

  const resetGuidedTour = useCallback(() => {
    setGuidedTourStep(0);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GUIDED_TOUR_STORAGE_KEY);
    }
  }, []);

  const goToNextTourStep = useCallback(() => {
    setGuidedTourStep((current) => {
      if (current === null) {
        return current;
      }
      return current >= totalSteps - 1 ? current : current + 1;
    });
  }, [totalSteps]);

  const goToPreviousTourStep = useCallback(() => {
    setGuidedTourStep((current) => {
      if (current === null) {
        return current;
      }
      return current <= 0 ? current : current - 1;
    });
  }, []);

  return {
    guidedTourStep,
    setGuidedTourStep,
    completeGuidedTour,
    resetGuidedTour,
    goToNextTourStep,
    goToPreviousTourStep,
  };
}
