import { useEffect, useState } from "react";

type Props = {
  label: string;
};

export function PendingComponentOverlay({ label }: Props) {
  const [position, setPosition] = useState(() => ({
    x: typeof window === "undefined" ? 0 : Math.round(window.innerWidth * 0.5),
    y: typeof window === "undefined" ? 0 : Math.round(window.innerHeight * 0.5),
  }));

  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      setPosition({
        x: event.clientX,
        y: event.clientY,
      });
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, []);

  return (
    <div
      className="componentAttachLayer"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      aria-hidden="true"
    >
      <div className="componentAttachToken">{label}</div>
    </div>
  );
}
