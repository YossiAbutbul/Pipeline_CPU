import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FocusEvent, MouseEvent, ReactElement, ReactNode } from "react";
import type { TooltipAlign } from "../Tooltip/types";
import "./buttonTooltip.css";

type Props = {
  title: string;
  align?: TooltipAlign;
  className?: string;
  children: ReactNode;
};

const GAP_PX = 4;
const VIEWPORT_PADDING_PX = 10;

export function ButtonTooltip({
  title,
  align = "center",
  className = "",
  children,
}: Props) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const visible = hovered || focused;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!visible || !anchorRef.current || !tooltipRef.current) {
      return;
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_PADDING_PX;
    const spaceAbove = anchorRect.top - VIEWPORT_PADDING_PX;
    const nextPlacement = spaceBelow < tooltipRect.height && spaceAbove > spaceBelow ? "top" : "bottom";

    const rawLeft = align === "start"
      ? anchorRect.left
      : align === "end"
        ? anchorRect.right - tooltipRect.width
        : anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);

    const rawTop = nextPlacement === "top"
      ? anchorRect.top - tooltipRect.height - GAP_PX
      : anchorRect.bottom + GAP_PX;

    const left = Math.min(
      Math.max(rawLeft, VIEWPORT_PADDING_PX),
      window.innerWidth - tooltipRect.width - VIEWPORT_PADDING_PX,
    );
    const top = Math.min(
      Math.max(rawTop, VIEWPORT_PADDING_PX),
      window.innerHeight - tooltipRect.height - VIEWPORT_PADDING_PX,
    );

    setPlacement(nextPlacement);
    setPosition({ left, top });
  }, [align, title, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const handleViewportChange = () => {
      if (!anchorRef.current || !tooltipRef.current) {
        return;
      }

      const anchorRect = anchorRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const rawLeft = align === "start"
        ? anchorRect.left
        : align === "end"
          ? anchorRect.right - tooltipRect.width
          : anchorRect.left + (anchorRect.width / 2) - (tooltipRect.width / 2);
      const rawTop = placement === "top"
        ? anchorRect.top - tooltipRect.height - GAP_PX
        : anchorRect.bottom + GAP_PX;

      const left = Math.min(
        Math.max(rawLeft, VIEWPORT_PADDING_PX),
        window.innerWidth - tooltipRect.width - VIEWPORT_PADDING_PX,
      );
      const top = Math.min(
        Math.max(rawTop, VIEWPORT_PADDING_PX),
        window.innerHeight - tooltipRect.height - VIEWPORT_PADDING_PX,
      );

      setPosition({ left, top });
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [align, placement, visible]);

  if (!isValidElement(children)) {
    return <>{children}</>;
  }

  const child = children as ReactElement<any>;

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    child.props.onMouseEnter?.(event);
    setHovered(true);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLElement>) => {
    child.props.onMouseLeave?.(event);
    setHovered(false);
  };

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    child.props.onFocus?.(event);
    setFocused(true);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    child.props.onBlur?.(event);
    setFocused(false);
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    child.props.onClick?.(event);
    setHovered(false);
    setFocused(false);
  };

  const setAnchorRef = (node: HTMLElement | null) => {
    anchorRef.current = node;
    const ref = (child as any).ref as
      | ((node: HTMLElement | null) => void)
      | { current: HTMLElement | null }
      | null
      | undefined;
    if (typeof ref === "function") {
      ref(node);
      return;
    }
    if (ref && typeof ref === "object") {
      ref.current = node;
    }
  };

  const anchoredChild = cloneElement(child, {
    className: [child.props.className, className].filter(Boolean).join(" "),
    onBlur: handleBlur,
    onClick: handleClick,
    onFocus: handleFocus,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ref: setAnchorRef,
  });

  return (
    <>
      {anchoredChild}
      {portalReady ? createPortal(
        <span
          ref={tooltipRef}
          role="tooltip"
          className={`buttonTitleTooltip ${visible ? "isVisible" : ""} buttonTitleTooltip-${placement}`}
          style={{ left: `${position.left}px`, top: `${position.top}px` }}
        >
          <span className="buttonTitleTooltipText">{title}</span>
        </span>,
        document.body,
      ) : null}
    </>
  );
}
