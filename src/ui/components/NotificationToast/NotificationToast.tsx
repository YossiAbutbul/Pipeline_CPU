import { Check, Info, TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties } from "react";
import "./notificationToast.css";

export type NotificationTone = "success" | "info" | "warning" | "error";

export type NotificationItem = {
  id: number;
  message: string;
  title?: string;
  tone?: NotificationTone;
  durationMs?: number;
};

type Props = {
  notifications: NotificationItem[];
  onDismiss: (id: number) => void;
};

function getNotificationIcon(tone: NotificationTone) {
  switch (tone) {
    case "success":
      return <Check size={14} aria-hidden="true" />;
    case "warning":
      return <TriangleAlert size={14} aria-hidden="true" />;
    case "error":
      return <span className="notificationToastGlyph" aria-hidden="true">!</span>;
    case "info":
    default:
      return <Info size={14} aria-hidden="true" />;
  }
}

function NotificationToastItem({
  id,
  message,
  title,
  tone = "info",
  durationMs = 2600,
  onDismiss,
}: NotificationItem & { onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, id, onDismiss]);

  return (
    <div className={`notificationToast notificationToast-${tone}`} role="status" aria-live="polite">
      <div className="notificationToastMain">
        <span className={`notificationToastIcon notificationToastIcon-${tone}`}>{getNotificationIcon(tone)}</span>
        <div className="notificationToastText">
          <div className="notificationToastHeaderRow">
            <div className="notificationToastHeader">
              <span className="notificationToastTitle">{title ?? "Notification"}</span>
            </div>
            <button
              type="button"
              className="notificationToastClose"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(id)}
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
          <span className="notificationToastBody">{message}</span>
        </div>
      </div>
      <span
        className="notificationToastProgress"
        style={{ "--notification-duration": `${durationMs}ms` } as CSSProperties}
        aria-hidden="true"
      />
    </div>
  );
}

export function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notificationToastViewport" aria-label="Notifications">
      {notifications.map((notification) => (
        <NotificationToastItem key={notification.id} {...notification} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
