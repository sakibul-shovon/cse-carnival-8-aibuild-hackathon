"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../../services/api";
import type { Notification } from "../../types/api";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setNotifications(await api.getNotifications({ limit: 10 }));
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function markRead(id: string): Promise<void> {
    const updated = await api.markNotificationRead(id);
    setNotifications((current) => current.map((item) => item.id === id ? updated : item));
  }

  return {
    notifications,
    unreadCount: notifications.filter((item) => item.status !== "READ").length,
    isLoading,
    markRead
  };
}
