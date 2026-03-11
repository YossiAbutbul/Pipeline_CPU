import type { ReactNode } from "react";
import { Tooltip } from "../Tooltip/Tooltip";
import "./errorMessage.css";

type Props = {
  message: ReactNode;
  className?: string;
  onDismiss?: () => void;
};

export function ErrorMessage({ message, className = "", onDismiss }: Props) {
  return (
    <Tooltip
      className={`errorMessage ${className}`.trim()}
      variant="error"
      ariaLabel="Error details"
      align="start"
      showTrigger={false}
      open
      dismissible={Boolean(onDismiss)}
      onDismiss={onDismiss}
      content={message}
    />
  );
}
