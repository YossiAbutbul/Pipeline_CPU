import type { TooltipAlign } from "../Tooltip/types";
import { ButtonTooltip } from "../ButtonTooltip/ButtonTooltip";
import "./button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tooltipTitle?: string;
  tooltipAlign?: TooltipAlign;
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  tooltipTitle,
  tooltipAlign = "center",
  title,
  ...props
}: Props) {
  const resolvedTooltipTitle = tooltipTitle ?? (typeof title === "string" ? title : undefined);

  const button = (
    <button
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    />
  );

  if (!resolvedTooltipTitle) {
    return button;
  }

  return (
    <ButtonTooltip title={resolvedTooltipTitle} align={tooltipAlign}>
      {button}
    </ButtonTooltip>
  );
}
