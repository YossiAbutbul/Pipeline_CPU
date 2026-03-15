import { Button, GuidedTourTooltip, Panel, Tooltip } from "@/ui/components";
import CpuDiagram from "@/assets/cpu/mips_cpu.svg?react";
import { getComponentValuePreview } from "@/features/components/placement/componentValueModel";
import type { PlacedComponent } from "@/features/components/placement/usePendingComponentPlacement";
import { FastForward, Rewind, RotateCcw, SkipBack, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PATH_SIGNAL_MAP, type HoveredSignalValues } from "./pipelineHoverMap";
import type { PipelineEffectSlots } from "@/features/simulator/core/types";
import "./pipelineCanvas.css";

declare global {
  interface Window {
    __pipelinePathDebug?: {
      getRows: () => Array<{
        id: string;
        label: string;
        key: string;
        value: string;
        mapped: boolean;
      }>;
      dumpAllPaths: () => void;
      getLiveState: () => {
        clockCycle: number;
        pipeline: PipelineSlots;
        pipelineEffects?: PipelineEffectSlots;
        runtimeRegisterValues?: Record<string, string>;
        hoveredSignalValues: HoveredSignalValues;
        lastHoverCandidates?: Array<{
          pathId: string;
          label: string;
          key: string;
          value: string;
        }>;
      };
    };
  }
}

type PipelineSlots = {
  IF: string | null;
  ID: string | null;
  EX: string | null;
  MEM: string | null;
  WB: string | null;
};

type HoverTooltipState = {
  pathId: string;
  label: string;
  value: string;
  componentPreview?: {
    label: string;
    beforeHex: string;
    afterHex: string;
  } | null;
  left: number;
  top: number;
} | null;

type Props = {
  pipeline: PipelineSlots;
  pipelineEffects?: PipelineEffectSlots;
  runtimeRegisterValues?: Record<string, string>;
  hoveredSignalValues: HoveredSignalValues;
  clockCycle: number;
  showClockCycle: boolean;
  enableSignalHover: boolean;
  onResetTracking: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  canStepBackward: boolean;
  canStepForward: boolean;
  showStepForwardTourStep: boolean;
  onBackStepForwardTourStep: () => void;
  onNextStepForwardTourStep: () => void;
  showHoverDiagramTourStep: boolean;
  onBackHoverDiagramTourStep: () => void;
  onDismissTour: () => void;
  placedComponents?: PlacedComponent[];
  pendingComponentLabel?: string | null;
  onPlacePendingComponent?: (placement: { pathId: string; x: number; y: number }) => void;
  onDeletePlacedComponent?: (componentId: number) => void;
};

const STAGE_ORDER: Array<keyof PipelineSlots> = ["IF", "ID", "EX", "MEM", "WB"];
const CPU_DIAGRAM_WIDTH = 1848;
const CPU_DIAGRAM_HEIGHT = 1075;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.1;

export default function PipelineCanvas({
  pipeline,
  pipelineEffects,
  runtimeRegisterValues,
  hoveredSignalValues,
  clockCycle,
  showClockCycle,
  enableSignalHover,
  onResetTracking,
  onStepForward,
  onStepBackward,
  canStepBackward,
  canStepForward,
  showStepForwardTourStep,
  onBackStepForwardTourStep,
  onNextStepForwardTourStep,
  showHoverDiagramTourStep,
  onBackHoverDiagramTourStep,
  onDismissTour,
  placedComponents = [],
  pendingComponentLabel = null,
  onPlacePendingComponent,
  onDeletePlacedComponent,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });
  const lastHoverCandidatesRef = useRef<
    Array<{
      pathId: string;
      label: string;
      key: string;
      value: string;
    }>
  >([]);

  const canDrag = zoom > 1;
  const baseDiagramWidth = viewportWidth > 0 ? viewportWidth : CPU_DIAGRAM_WIDTH;
  const diagramWidth = baseDiagramWidth * zoom;
  const diagramHeight = (baseDiagramWidth * CPU_DIAGRAM_HEIGHT * zoom) / CPU_DIAGRAM_WIDTH;

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  };

  const handleResetView = () => {
    setZoom(1);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = 0;
      viewportRef.current.scrollTop = 0;
    }
    setIsDragging(false);
  };

  const handleDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (pendingComponentLabel || !canDrag || !viewportRef.current) {
      return;
    }

    event.preventDefault();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: viewportRef.current.scrollLeft,
      startScrollTop: viewportRef.current.scrollTop,
    };
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    if (!isDragging) {
      return;
    }
    setIsDragging(false);
  };

  const getSvgPlacementPoint = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    const point = new DOMPoint(clientX, clientY);
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return null;
    }

    const svgPoint = point.matrixTransform(matrix.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const handleWindowMouseMove = (event: MouseEvent) => {
      if (!viewportRef.current) {
        return;
      }

      const deltaX = event.clientX - dragRef.current.startX;
      const deltaY = event.clientY - dragRef.current.startY;
      viewportRef.current.scrollLeft = dragRef.current.startScrollLeft - deltaX;
      viewportRef.current.scrollTop = dragRef.current.startScrollTop - deltaY;
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const viewportElement = viewportRef.current;
    if (!viewportElement) {
      return;
    }

    const updateViewportWidth = () => {
      setViewportWidth(viewportElement.clientWidth);
    };

    updateViewportWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateViewportWidth();
    });
    resizeObserver.observe(viewportElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const diagramElement = diagramRef.current;
    if (!diagramElement) {
      return;
    }

    const svg = diagramElement.querySelector("svg");
    if (!svg) {
      return;
    }

    const sourcePaths = Array.from(
      svg.querySelectorAll<SVGPathElement>('path[id^="w_"], path[id^="ctrl_"]'),
    );
    if (!sourcePaths.length) {
      return;
    }

    const cleanupFns: Array<() => void> = [];
    const hitGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    hitGroup.setAttribute("data-role", "hover-hit-areas");

    const targetById = new Map<string, SVGPathElement>();
    const pathAreaById = new Map<string, number>();
    let activeHoveredPathId: string | null = null;

    const priorityHitPaths: SVGPathElement[] = [];

    const clearHoveredPath = () => {
      if (!activeHoveredPathId) {
        return;
      }

      const activePath = targetById.get(activeHoveredPathId);
      activePath?.classList.remove("isHovered", "isPlacementCandidate");
      activeHoveredPathId = null;
    };

    const setHoveredPath = (pathId: string | null) => {
      if (activeHoveredPathId === pathId) {
        return;
      }

      clearHoveredPath();

      if (!pathId) {
        return;
      }

      const nextPath = targetById.get(pathId);
      if (!nextPath) {
        return;
      }

      if (enableSignalHover) {
        nextPath.classList.add("isHovered");
      }
      if (pendingComponentLabel && !pathId.startsWith("ctrl_")) {
        nextPath.classList.add("isPlacementCandidate");
      }
      activeHoveredPathId = pathId;
    };

    const resolveBestHoveredPathId = (clientX: number, clientY: number) => {
      const candidates = document.elementsFromPoint(clientX, clientY)
        .filter((element): element is SVGPathElement =>
          element instanceof SVGPathElement && element.classList.contains("cpuHitPath"),
        )
        .map((element) => element.getAttribute("data-target-id"))
        .filter((pathId): pathId is string => Boolean(pathId))
        .filter((pathId, index, array) => array.indexOf(pathId) === index);

      lastHoverCandidatesRef.current = candidates.map((pathId) => {
        const signal = PATH_SIGNAL_MAP[pathId];
        return {
          pathId,
          label: signal?.label ?? "Unmapped",
          key: signal?.key ?? "unmapped",
          value: signal ? hoveredSignalValues[signal.key] ?? "Unknown" : "Unknown",
        };
      });

      if (candidates.length === 0) {
        return null;
      }

      const scoredCandidates = candidates.map((pathId, index) => {
        const signal = PATH_SIGNAL_MAP[pathId];
        const value = signal ? hoveredSignalValues[signal.key] ?? "Unknown" : "Unknown";
        const hasKnownValue = value !== "Unknown";
        const isDataPath = !pathId.startsWith("ctrl_");
        const pathArea = pathAreaById.get(pathId) ?? Number.POSITIVE_INFINITY;

        return {
          pathId,
          index,
          hasKnownValue,
          isDataPath,
          pathArea,
        };
      });

      scoredCandidates.sort((a, b) => {
        if (a.hasKnownValue !== b.hasKnownValue) {
          return a.hasKnownValue ? -1 : 1;
        }
        if (a.isDataPath !== b.isDataPath) {
          return a.isDataPath ? -1 : 1;
        }
        if (a.pathArea !== b.pathArea) {
          return a.pathArea - b.pathArea;
        }
        return a.index - b.index;
      });

      const bestCandidate = scoredCandidates[0];
      if (!bestCandidate) {
        return null;
      }

      return bestCandidate.pathId;
    };

    sourcePaths.forEach((path) => {
      const pathId = path.id;
      const isControl = pathId.startsWith("ctrl_");
      path.classList.add("cpuPath", isControl ? "cpuPathControl" : "cpuPathData");
      path.classList.remove("isHovered");
      targetById.set(pathId, path);
      try {
        const bbox = path.getBBox();
        pathAreaById.set(pathId, bbox.width * bbox.height);
      } catch {
        pathAreaById.set(pathId, Number.POSITIVE_INFINITY);
      }

      const dValue = path.getAttribute("d");
      if (!dValue) {
        return;
      }

      const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitPath.setAttribute("d", dValue);
      hitPath.setAttribute("class", "cpuHitPath");
      hitPath.setAttribute("data-target-id", pathId);
      if (pathId === "w_signext_32bit_imm_to_idex") {
        hitPath.setAttribute("stroke-width", "12");
        priorityHitPaths.push(hitPath);
      } else {
        hitGroup.appendChild(hitPath);
      }

      const handleEnter = (event: PointerEvent) => {
        setHoveredPath(resolveBestHoveredPathId(event.clientX, event.clientY) ?? pathId);
      };

      const handleMove = (event: PointerEvent) => {
        const resolvedPathId = resolveBestHoveredPathId(event.clientX, event.clientY) ?? pathId;
        setHoveredPath(resolvedPathId);

        const signal = PATH_SIGNAL_MAP[resolvedPathId];
        const diagramBounds = diagramElement.getBoundingClientRect();
        if (!enableSignalHover) {
          setHoverTooltip(null);
          return;
        }
        if (!signal) {
          setHoverTooltip(null);
          return;
        }

        const hoveredValue = hoveredSignalValues[signal.key] ?? "Unknown";
        const placedComponent = placedComponents.find((component) => component.pathId === resolvedPathId);
        const componentPreview = placedComponent
          ? getComponentValuePreview(placedComponent.label, hoveredValue)
          : null;

        setHoverTooltip({
          pathId: resolvedPathId,
          label: signal.label,
          value: hoveredValue,
          componentPreview: componentPreview
            ? {
                label: componentPreview.componentLabel,
                beforeHex: componentPreview.beforeHex,
                afterHex: componentPreview.afterHex,
              }
            : null,
          left: event.clientX - diagramBounds.left + 18,
          top: event.clientY - diagramBounds.top - 18,
        });
      };

      const handleLeave = () => {
        clearHoveredPath();
        setHoverTooltip((current) => {
          if (!current) {
            return current;
          }
          return null;
        });
      };

      const handlePlace = (event: PointerEvent) => {
        const resolvedPathId = resolveBestHoveredPathId(event.clientX, event.clientY) ?? pathId;
        if (!pendingComponentLabel || !onPlacePendingComponent || resolvedPathId.startsWith("ctrl_")) {
          return;
        }
        event.preventDefault();
        const placementPoint = getSvgPlacementPoint(svg, event.clientX, event.clientY);
        if (!placementPoint) {
          return;
        }
        onPlacePendingComponent({
          pathId: resolvedPathId,
          x: placementPoint.x,
          y: placementPoint.y,
        });
      };

      hitPath.addEventListener("pointerenter", handleEnter);
      hitPath.addEventListener("pointermove", handleMove);
      hitPath.addEventListener("pointerleave", handleLeave);
      hitPath.addEventListener("pointerdown", handlePlace);
      cleanupFns.push(() => {
        hitPath.removeEventListener("pointerenter", handleEnter);
        hitPath.removeEventListener("pointermove", handleMove);
        hitPath.removeEventListener("pointerleave", handleLeave);
        hitPath.removeEventListener("pointerdown", handlePlace);
      });
    });

    priorityHitPaths.forEach((hitPath) => {
      hitGroup.appendChild(hitPath);
    });

    svg.appendChild(hitGroup);

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      hitGroup.remove();
      clearHoveredPath();
      targetById.forEach((path) => {
        path.classList.remove(
          "cpuPath",
          "cpuPathControl",
          "cpuPathData",
          "isHovered",
          "isPlacementCandidate",
        );
      });
      setHoverTooltip(null);
    };
  }, [
    enableSignalHover,
    hoveredSignalValues,
    onPlacePendingComponent,
    pendingComponentLabel,
    placedComponents,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const getRows = () =>
      Object.entries(PATH_SIGNAL_MAP)
        .filter((entry): entry is [string, NonNullable<(typeof PATH_SIGNAL_MAP)[string]>] => Boolean(entry[1]))
        .map(([id, signal]) => ({
          id,
          label: signal.label,
          key: signal.key,
          value: hoveredSignalValues[signal.key] ?? "Unknown",
          mapped: true,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    window.__pipelinePathDebug = {
      getRows,
      dumpAllPaths: () => {
        console.table(getRows());
      },
      getLiveState: () => ({
        clockCycle,
        pipeline,
        pipelineEffects,
        runtimeRegisterValues,
        hoveredSignalValues,
        lastHoverCandidates: lastHoverCandidatesRef.current,
      }),
    };

    return () => {
      delete window.__pipelinePathDebug;
    };
  }, [clockCycle, hoveredSignalValues, pipeline, pipelineEffects, runtimeRegisterValues]);

  return (
    <Panel title="Pipeline CPU Diagram" headerSize="xl">
      <div className="pipelineCanvasLayout">
        <div className="pipelineTracker" aria-label="Pipeline stage tracker">
          {STAGE_ORDER.map((stage) => {
            const instruction = pipeline[stage];
            return (
              <div key={stage} className={`pipelineStage ${instruction ? "isActive" : ""}`}>
                <div className="pipelineStageName">{stage}</div>
                <div className="pipelineStageInstruction">{instruction ?? "Unknown"}</div>
              </div>
            );
          })}
        </div>
        <div className={`pipelineTrackerControls ${showClockCycle ? "hasCycleCounter" : ""}`}>
          {showClockCycle && (
            <div className="pipelineCycleCounter" aria-live="polite">
              Clock Cycle: {clockCycle}
            </div>
          )}
          <div className="pipelineTrackerButtonGroup">
            <Button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="btn-iconOnly"
              aria-label="Zoom out diagram"
              title="Zoom out diagram"
            >
              <ZoomOut size={20} aria-hidden="true" />
            </Button>
            <Button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="btn-iconOnly"
              aria-label="Zoom in diagram"
              title="Zoom in diagram"
            >
              <ZoomIn size={20} aria-hidden="true" />
            </Button>
            <Button
              onClick={handleResetView}
              className="btn-iconOnly"
              aria-label="Reset diagram view"
              title="Reset diagram view"
            >
              <RotateCcw size={20} aria-hidden="true" />
            </Button>
            <span className="pipelineControlsDivider" aria-hidden="true" />
            <Button
              onClick={onStepBackward}
              disabled={!canStepBackward}
              className="btn-iconOnly"
              aria-label="Step backward"
              title="Step backward"
            >
              <Rewind size={20} aria-hidden="true" />
            </Button>
            <Button
              onClick={onResetTracking}
              disabled={!canStepBackward && !canStepForward}
              className="btn-iconOnly"
              aria-label="Reset pipeline tracking"
              title="Reset pipeline tracking"
            >
              <SkipBack size={20} aria-hidden="true" />
            </Button>
            <GuidedTourTooltip
              className="pipelineStepHintTooltip"
              align="end"
              open={showStepForwardTourStep}
              step={7}
              totalSteps={9}
              title="Step Through Execution"
              description="Step one clock cycle at a time and watch the pipeline update."
              onBack={onBackStepForwardTourStep}
              onNext={onNextStepForwardTourStep}
              onSkip={onDismissTour}
              onClose={onDismissTour}
            >
              <Button
                onClick={onStepForward}
                disabled={!canStepForward}
                className="btn-iconOnly"
                aria-label="Step forward"
                title="Step forward"
              >
                <FastForward size={20} aria-hidden="true" />
              </Button>
            </GuidedTourTooltip>
          </div>
        </div>

        <div className="pipelineDiagramViewportShell">
          <GuidedTourTooltip
            className="pipelineDiagramTourTooltip"
            align="start"
            open={showHoverDiagramTourStep}
            step={9}
            totalSteps={9}
            title="Hover The Diagram"
            description="Hover highlighted paths to inspect the current signal values."
            onBack={onBackHoverDiagramTourStep}
            onNext={onDismissTour}
            nextLabel="Finish"
            onClose={onDismissTour}
          >
            <span className="pipelineDiagramTourAnchor" aria-hidden="true" />
          </GuidedTourTooltip>
          <div
            ref={viewportRef}
            className={`diagramViewport ${canDrag ? "canDrag" : ""} ${isDragging ? "isDragging" : ""} ${
              pendingComponentLabel ? "isPlacingComponent" : ""
            }`}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
          >
            <div
              className="diagramSurface"
              style={{ width: `${diagramWidth}px`, height: `${diagramHeight}px` }}
            >
              <div
                ref={diagramRef}
                className="diagramContent"
                style={{ width: `${diagramWidth}px`, height: `${diagramHeight}px` }}
              >
              <CpuDiagram style={{ width: "100%", height: "auto" }} />
              <svg
                className={`placedComponentOverlay ${
                  !pendingComponentLabel && !enableSignalHover ? "isInteractive" : ""
                }`}
                viewBox="0 0 1848 1075"
                aria-hidden="true"
              >
                {placedComponents.map((component) => {
                  return (
                    <g
                      key={component.id}
                      className="placedComponentToken"
                      transform={`translate(${component.x} ${component.y})`}
                    >
                      <circle r="24" />
                      <text textAnchor="middle" dominantBaseline="central">
                        {component.label}
                      </text>
                      {!enableSignalHover ? (
                        <g
                          className="placedComponentDelete"
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onDeletePlacedComponent?.(component.id);
                          }}
                        >
                          <circle cx="15" cy="-15" r="9" />
                          <text x="15" y="-15" textAnchor="middle" dominantBaseline="central">
                            x
                          </text>
                        </g>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              {hoverTooltip && (
                <div
                  className="pipelineHoverTooltip"
                  style={{ left: `${hoverTooltip.left}px`, top: `${hoverTooltip.top}px` }}
                >
                  <Tooltip
                    showTrigger={false}
                    open
                    align="center"
                    ariaLabel={`${hoverTooltip.label} value`}
                    content={
                      <div className="pipelineTooltipBody">
                        <div className="pipelineTooltipHeader">{hoverTooltip.label}</div>
                        <div className="pipelineTooltipPathId">{hoverTooltip.pathId}</div>
                        <div className="pipelineTooltipContent">{hoverTooltip.value}</div>
                        {hoverTooltip.componentPreview ? (
                          <div className="pipelineTooltipComponentPreview">
                            <div className="pipelineTooltipComponentTitle">
                              {hoverTooltip.componentPreview.label} on path
                            </div>
                            <div className="pipelineTooltipComponentRow">
                              <span>Before</span>
                              <code>{hoverTooltip.componentPreview.beforeHex}</code>
                            </div>
                            <div className="pipelineTooltipComponentRow">
                              <span>After</span>
                              <code>{hoverTooltip.componentPreview.afterHex}</code>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    }
                  />
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
