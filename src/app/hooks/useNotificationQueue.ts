import { useCallback, useState } from "react";
import type { NotificationItem } from "@/ui/components/NotificationToast/NotificationToast";

export function useNotificationQueue() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const pushNotification = useCallback((notification: Omit<NotificationItem, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications((prev) => {
      const duplicateIndex = prev.findIndex(
        (item) =>
          item.tone === notification.tone &&
          item.title === notification.title &&
          item.message === notification.message,
      );

      if (duplicateIndex !== -1) {
        const next = [...prev];
        next[duplicateIndex] = { ...next[duplicateIndex], ...notification, id };
        return next;
      }

      return [...prev, { ...notification, id }].slice(-2);
    });
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  }, []);

  return {
    notifications,
    pushNotification,
    dismissNotification,
  };
}
