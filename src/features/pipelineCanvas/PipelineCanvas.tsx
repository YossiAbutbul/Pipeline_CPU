import { Button, Panel, Tooltip } from "@/ui/components";
import CpuDiagram from "@/assets/cpu/mips_cpu.svg?react";
import { FastForward, Rewind, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./pipelineCanvas.css";

type PipelineSlots = {
  IF: string | null;
  ID: string | null;
  EX: string | null;
  MEM: string | null;
  WB: string | null;
};

type HoverSignalKey = "pc" | "pcPlus4" | "constant4" | "instructionWord" | "rsValue" | "rtValue";

type HoveredSignalValues = Partial<Record<HoverSignalKey, string>>;

type HoverTooltipState = {
  label: string;
  value: string;
  left: number;
  top: number;
} | null;

type Props = {
  pipeline: PipelineSlots;
  hoveredSignalValues: HoveredSignalValues;
  onStepForward: () => void;
  onStepBackward: () => void;
  canStepBackward: boolean;
  canStepForward: boolean;
};

const STAGE_ORDER: Array<keyof PipelineSlots> = ["IF", "ID", "EX", "MEM", "WB"];
const PATH_SIGNAL_MAP: Partial<Record<string, { key: HoverSignalKey; label: string }>> = {
  w_pc_to_imem: { key: "pc", label: "PC" },
  w_pc_to_adder_pc4: { key: "pc", label: "PC" },
  w_4_to_adder_pc4: { key: "constant4", label: "Constant 4" },
  w_adder_pc4_to_ifid: { key: "pcPlus4", label: "PC + 4" },
  w_imem_to_ifid: { key: "instructionWord", label: "Instruction" },
  w_regfile_rs2_to_idex: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rs2_to_cmp_eq: { key: "rsValue", label: "Read Data 1" },
  w_regfile_rt2_to_idex: { key: "rtValue", label: "Read Data 2" },
  w_regfile_rt2_to_cmp_eq: { key: "rtValue", label: "Read Data 2" },
};

export default function PipelineCanvas({
  pipeline,
  hoveredSignalValues,
  onStepForward,
  onStepBackward,
  canStepBackward,
  canStepForward,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    startScrollLeft: 0,
    startScrollTop: 0,
  });

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2.5;
  const ZOOM_STEP = 0.1;
  const canDrag = zoom > 1;

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
    if (!canDrag || !viewportRef.current) {
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

    const priorityHitPaths: SVGPathElement[] = [];

    sourcePaths.forEach((path) => {
      const pathId = path.id;
      const isControl = pathId.startsWith("ctrl_");
      path.classList.add("cpuPath", isControl ? "cpuPathControl" : "cpuPathData");
      path.classList.remove("isHovered");
      targetById.set(pathId, path);

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

      const handleEnter = () => {
        path.classList.add("isHovered");
      };

      const handleMove = (event: PointerEvent) => {
        const signal = PATH_SIGNAL_MAP[pathId];
        const diagramBounds = diagramElement.getBoundingClientRect();
        if (!signal) {
          setHoverTooltip(null);
          return;
        }

        const value = hoveredSignalValues[signal.key];
        if (!value) {
          setHoverTooltip(null);
          return;
        }

        setHoverTooltip({
          label: signal.label,
          value,
          left: event.clientX - diagramBounds.left,
          top: event.clientY - diagramBounds.top,
        });
      };

      const handleLeave = () => {
        path.classList.remove("isHovered");
        setHoverTooltip((current) => {
          if (!current) {
            return current;
          }
          return null;
        });
      };

      hitPath.addEventListener("pointerenter", handleEnter);
      hitPath.addEventListener("pointermove", handleMove);
      hitPath.addEventListener("pointerleave", handleLeave);
      cleanupFns.push(() => {
        hitPath.removeEventListener("pointerenter", handleEnter);
        hitPath.removeEventListener("pointermove", handleMove);
        hitPath.removeEventListener("pointerleave", handleLeave);
      });
    });

    priorityHitPaths.forEach((hitPath) => {
      hitGroup.appendChild(hitPath);
    });

    svg.appendChild(hitGroup);

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      hitGroup.remove();
      targetById.forEach((path) => {
        path.classList.remove("cpuPath", "cpuPathControl", "cpuPathData", "isHovered");
      });
      setHoverTooltip(null);
    };
  }, [hoveredSignalValues]);

  return (
    <Panel title="5 Stages Pipeline CPU Diagram" headerSize="xl">
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
        <div className="pipelineTrackerControls">
          <Button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="btn-iconOnly"
            aria-label="Zoom out diagram"
            title="Zoom out diagram"
          >
            <ZoomOut size={16} aria-hidden="true" />
          </Button>
          <Button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="btn-iconOnly"
            aria-label="Zoom in diagram"
            title="Zoom in diagram"
          >
            <ZoomIn size={16} aria-hidden="true" />
          </Button>
        <Button
          onClick={handleResetView}
          className="btn-iconOnly"
          aria-label="Reset diagram view"
          title="Reset diagram view"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </Button>
        <span className="pipelineControlsDivider" aria-hidden="true" />
        <Button
          onClick={onStepBackward}
          disabled={!canStepBackward}
          className="btn-iconOnly"
          aria-label="Step backward"
            title="Step backward"
          >
            <Rewind size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="primary"
            onClick={onStepForward}
            disabled={!canStepForward}
            className="btn-iconOnly"
            aria-label="Step forward"
            title="Step forward"
          >
            <FastForward size={16} aria-hidden="true" />
          </Button>
        </div>

        <div
          ref={viewportRef}
          className={`diagramViewport ${canDrag ? "canDrag" : ""} ${isDragging ? "isDragging" : ""}`}
          onMouseDown={handleDragStart}
          onMouseUp={handleDragEnd}
        >
          <div ref={diagramRef} className="diagramContent" style={{ width: `${90 * zoom}%` }}>
            <CpuDiagram style={{ width: "100%", height: "auto" }} />
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
                      <div className="pipelineTooltipLabel">{hoverTooltip.label}</div>
                      <div className="pipelineTooltipValue">{hoverTooltip.value}</div>
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
