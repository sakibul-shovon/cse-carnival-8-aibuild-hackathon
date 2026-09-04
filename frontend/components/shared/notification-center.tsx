"use client";

import { Bell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNotifications } from "../../features/notifications/useNotifications";
import { formatDateTime, titleCase } from "../../utils/format";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, isLoading, markRead } = useNotifications();

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  return <div className="relative" ref={container}>
    <Button type="button" variant="outline" size="icon" aria-label={`${unreadCount} unread notifications`} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
      <Bell className="size-4" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{Math.min(unreadCount, 9)}</span>}
    </Button>
    {isOpen && <div className="absolute right-0 z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg">
      <div className="border-b px-4 py-3"><p className="font-semibold">Notifications</p><p className="text-xs text-muted-foreground">{unreadCount} unread</p></div>
      <div className="max-h-80 divide-y overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>}
        {!isLoading && notifications.length === 0 && <p className="p-4 text-sm text-muted-foreground">You’re all caught up.</p>}
        {notifications.map((notification) => <article key={notification.id} className="p-4">
          <div className="flex items-start justify-between gap-3"><div><Badge>{titleCase(notification.sourceType)}</Badge><p className="mt-2 text-sm leading-5">{notification.message}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(notification.sendAt)}</p></div>
          {notification.status !== "READ" && <button type="button" className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Mark notification read" onClick={() => void markRead(notification.id)}><Check className="size-4" /></button>}</div>
        </article>)}
      </div>
    </div>}
  </div>;
}
