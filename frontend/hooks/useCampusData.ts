"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { DashboardData } from "../types/api";

const emptyData: DashboardData = { schedules: [], rooms: [], events: [], assignments: [], announcements: [] };

export function useCampusData() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [schedules, rooms, events, assignments, announcements] = await Promise.all([
        api.getSchedules(), api.getRooms(), api.getEvents(), api.getAssignments(), api.getAnnouncements({ activeOnly: true })
      ]);
      setData({ schedules, rooms, events, assignments, announcements });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Campus data could not be loaded");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { data, isLoading, error, refresh };
}
