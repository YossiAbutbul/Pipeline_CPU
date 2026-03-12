import type { ReactNode } from "react";
import { Button } from "../Button/Button";
import { Tooltip } from "../Tooltip/Tooltip";
import type { TooltipAlign } from "../Tooltip/types";
import "./guidedTourTooltip.css";

type Props = {
  children: ReactNode;
  open: boolean;
  title: string;
  description: string;
  step?: number;
  totalSteps?: number;
  align?: TooltipAlign;
  className?: string;
  fullWidth?: boolean;
  onClose: () => void;
  onBack?: () => void;
  onNext?: () => void;
  onSkip?: () => void;
  backLabel?: string;
  nextLabel?: string;
  skipLabel?: string;
};

export function GuidedTourTooltip({
  children,
  open,
  title,
  description,
  step,
  totalSteps,
  align = "center",
  className = "",
  fullWidth = false,
  onClose,
  onBack,
  onNext,
  onSkip,
  backLabel = "Back",
  nextLabel = "Next",
  skipLabel = "Skip",
}: Props) {
  return (
    <Tooltip
      className={`guidedTourTooltip ${open ? "guidedTourTooltipActive" : ""} ${fullWidth ? "guidedTourTooltipFullWidth" : ""} ${className}`.trim()}
      align={align}
      ariaLabel={title}
      open={open}
      manual
      onDismiss={onClose}
      content={
        <div className="guidedTourTooltipPanel">
          {step && totalSteps ? <div className="guidedTourTooltipStep">Step {step}/{totalSteps}</div> : null}
          <div className="guidedTourTooltipTitle">{title}</div>
          <div className="guidedTourTooltipText">{description}</div>
          <div className="guidedTourTooltipActions">
            {onSkip ? (
              <Button type="button" size="sm" variant="ghost" onClick={onSkip}>
                {skipLabel}
              </Button>
            ) : <span />}
            <div className="guidedTourTooltipNav">
              {onBack ? (
                <Button type="button" size="sm" variant="secondary" onClick={onBack}>
                  {backLabel}
                </Button>
              ) : null}
              {onNext ? (
                <Button type="button" size="sm" variant="primary" onClick={onNext}>
                  {nextLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
