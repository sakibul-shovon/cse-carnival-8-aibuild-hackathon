"use client";

import * as React from "react";
import { CircleDashed } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import {
  BackendNotReadyError,
  fetchDashboardData,
} from "@/lib/data/dashboard";
import {
  activeAnnouncements,
  dashboardStats,
  nextClass,
  roomAvailability,
  todaysClasses,
  upcomingDeadlines,
  upcomingEvents,
} from "@/lib/dashboard-selectors";
import type { DashboardData } from "@/lib/types";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { StatCards } from "./stat-cards";
import { TodayScheduleCard } from "./today-schedule-card";
import { AnnouncementsCard } from "./announcements-card";
import { EventsCard } from "./events-card";
import { DeadlinesCard } from "./deadlines-card";
import { RoomsCard } from "./rooms-card";

type Status = "loading" | "ready" | "empty" | "error";

export function DashboardContent() {
  const [status, setStatus] = React.useState<Status>("loading");
  const [data, setData] = React.useState<DashboardData | null>(null);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const result = await fetchDashboardData(signal);
      if (signal?.aborted) return;
      setData(result);
      setStatus("ready");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setData(null);
      setStatus(err instanceof BackendNotReadyError ? "empty" : "error");
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  if (status === "loading") {
    return <DashboardSkeleton />;
  }

  if (status === "error") {
    return (
      <ErrorState
        title="Couldn't load your dashboard"
        description="We couldn't reach the campus data service. Please try again."
        onRetry={() => load()}
      />
    );
  }

  if (status === "empty" || !data) {
    return (
      <EmptyState
        icon={CircleDashed}
        title="Campus data isn't connected yet"
        description="Once the backend service is live, today's classes, events, announcements, deadlines, and room availability will appear here automatically."
      />
    );
  }

  const now = new Date();
  const stats = dashboardStats(data, now);
  const classes = todaysClasses(data.schedules, now);
  const next = nextClass(data.schedules, now);
  const announcements = activeAnnouncements(data.announcements, now);
  const events = upcomingEvents(data.events, now);
  const deadlines = upcomingDeadlines(data.assignments, now);
  const rooms = roomAvailability(data.rooms, now);

  return (
    <div className="flex flex-col gap-6">
      <StatCards stats={stats} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <TodayScheduleCard
          classes={classes}
          nextClassId={next?.id ?? null}
        />
        <DeadlinesCard assignments={deadlines} />
        <AnnouncementsCard announcements={announcements} />
        <EventsCard events={events} />
        <RoomsCard availability={rooms} />
      </div>
    </div>
  );
}
