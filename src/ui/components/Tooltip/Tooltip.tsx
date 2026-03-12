import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent } from "react";
import { Info, X } from "lucide-react";
import type { TooltipProps, TooltipVariant } from "./types";
import "./tooltip.css";

const DISMISS_ANIMATION_MS = 180;

function getDefaultTriggerLabel(variant: TooltipVariant) {
  switch (variant) {
    case "error":
      return "!";
    case "warning":
      return "?";
    case "success":
      return "v";
    case "info":
    default:
      return <Info size={12} aria-hidden="true" />;
  }
}

export function Tooltip({
  children,
  content,
  className = "",
  ariaLabel = "More information",
  align = "center",
  variant = "info",
  triggerLabel,
  showTrigger = true,
  open = false,
  dismissible = false,
  onDismiss,
  autoDismissMs,
}: TooltipProps) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const contentRef = useRef<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [shiftX, setShiftX] = useState(0);
  const [shiftY, setShiftY] = useState(0);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [closing, setClosing] = useState(false);
  const isVisible = (open || hovered || focused) && !closing;
  const hasCustomTrigger = children !== undefined && children !== null;
  const shouldCollapseWrapper = !showTrigger && !hasCustomTrigger;

  const updateShift = useCallback(() => {
    if (!contentRef.current || !wrapRef.current) {
      return;
    }
    const anchorRect = wrapRef.current.getBoundingClientRect();
    const rect = contentRef.current.getBoundingClientRect();
    const padding = 10;
    let nextShift = 0;
    if (rect.left < padding) {
      nextShift = padding - rect.left;
    } else if (rect.right > window.innerWidth - padding) {
      nextShift = (window.innerWidth - padding) - rect.right;
    }
    setShiftX((prev) => (prev === nextShift ? prev : nextShift));
    let nextShiftY = 0;
    if (rect.top < padding) {
      nextShiftY = padding - rect.top;
    } else if (rect.bottom > window.innerHeight - padding) {
      nextShiftY = (window.innerHeight - padding) - rect.bottom;
    }
    setShiftY((prev) => (prev === nextShiftY ? prev : nextShiftY));

    const spaceBelow = window.innerHeight - anchorRect.bottom - padding;
    const spaceAbove = anchorRect.top - padding;
    const nextPlacement = spaceBelow < rect.height && spaceAbove > spaceBelow ? "top" : "bottom";
    setPlacement((prev) => (prev === nextPlacement ? prev : nextPlacement));
  }, []);

  useLayoutEffect(() => {
    if (!isVisible) {
      setShiftX((prev) => (prev === 0 ? prev : 0));
      setShiftY((prev) => (prev === 0 ? prev : 0));
      setPlacement((prev) => (prev === "bottom" ? prev : "bottom"));
      return;
    }
    updateShift();
  }, [isVisible, updateShift, content]);

  useLayoutEffect(() => {
    if (!isVisible) {
      return;
    }
    const onViewportChange = () => updateShift();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isVisible, updateShift]);

  useEffect(() => {
    if (open) {
      setClosing(false);
    }
  }, [open]);

  const requestDismiss = useCallback(() => {
    if (!onDismiss) {
      return;
    }
    setClosing(true);
    window.setTimeout(() => {
      onDismiss();
    }, DISMISS_ANIMATION_MS);
  }, [onDismiss]);

  useEffect(() => {
    if (!open || !autoDismissMs || !onDismiss || hovered || focused || closing) {
      return;
    }
    const timer = window.setTimeout(() => {
      requestDismiss();
    }, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [open, autoDismissMs, onDismiss, hovered, focused, requestDismiss, closing]);

  const handleBlur = (event: FocusEvent<HTMLSpanElement>) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setFocused(false);
  };

  return (
    <span
      ref={wrapRef}
      className={`tooltipWrap ${shouldCollapseWrapper ? "tooltipWrapNoTrigger" : ""} ${isVisible ? "tooltipVisible" : ""} ${closing ? "tooltipClosing" : ""} ${className}`.trim()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      {children ?? (showTrigger && (
        <button type="button" className={`tooltipTrigger tooltipTrigger-${variant}`} aria-label={ariaLabel}>
          {triggerLabel ?? getDefaultTriggerLabel(variant)}
        </button>
      ))}
      <span
        ref={contentRef}
        role="tooltip"
        className={`tooltipContent tooltipContent-${variant} tooltipAlign-${align} tooltipPlace-${placement} ${open ? "tooltipOpen" : ""}`}
        style={{ "--tooltip-shift-x": `${shiftX}px`, "--tooltip-shift-y": `${shiftY}px` } as CSSProperties}
      >
        {dismissible && (
          <button
            type="button"
            className="tooltipClose"
            aria-label="Close tooltip"
            onClick={requestDismiss}
          >
            <X size={12} aria-hidden="true" />
          </button>
        )}
        <span className="tooltipBody">{content}</span>
      </span>
    </span>
  );
}
