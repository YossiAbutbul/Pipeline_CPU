import { Button, Panel } from "@/ui/components";
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

type Props = {
  pipeline: PipelineSlots;
  onStepForward: () => void;
  onStepBackward: () => void;
  canStepBackward: boolean;
  canStepForward: boolean;
};

const STAGE_ORDER: Array<keyof PipelineSlots> = ["IF", "ID", "EX", "MEM", "WB"];

export default function PipelineCanvas({
  pipeline,
  onStepForward,
  onStepBackward,
  canStepBackward,
  canStepForward,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
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
          <div className="diagramContent" style={{ width: `${90 * zoom}%` }}>
            <CpuDiagram style={{ width: "100%", height: "auto" }} />
          </div>
        </div>
      </div>
    </Panel>
  );
}
