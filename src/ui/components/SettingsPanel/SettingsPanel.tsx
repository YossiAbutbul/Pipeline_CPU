import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "./settingsPanel.css";

type Props = {
  open: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function SettingsPanel({
  open,
  title,
  className = "",
  children,
  onClose,
}: Props) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!panelRef.current?.contains(target)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className={`settingsPanel ${className}`.trim()}
      role="dialog"
      aria-label={title}
    >
      <header className="settingsPanelHeader">
        <h3 className="settingsPanelTitle">{title}</h3>
        <button
          type="button"
          className="settingsPanelCloseButton"
          aria-label="Close settings"
          onClick={onClose}
        >
          <X size={12} aria-hidden="true" />
        </button>
      </header>
      <div className="settingsPanelBody">{children}</div>
    </section>
  );
}
