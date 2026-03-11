import type { ReactNode } from "react";

export type TooltipAlign = "start" | "center" | "end";
export type TooltipVariant = "info" | "error" | "warning" | "success";

export type TooltipProps = {
  content: ReactNode;
  className?: string;
  ariaLabel?: string;
  align?: TooltipAlign;
  variant?: TooltipVariant;
  triggerLabel?: ReactNode;
  showTrigger?: boolean;
  open?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
};
