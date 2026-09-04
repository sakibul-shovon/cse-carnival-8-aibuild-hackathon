"use client";

import { useState } from "react";
import { AiAssistant } from "../../components/ai-chat/ai-assistant";
import { AnnouncementsList } from "../../components/dashboard/announcements-list";
import { AppShell, type DashboardView } from "../../components/dashboard/app-shell";
import { AssignmentsList } from "../../components/dashboard/assignments-list";
import { CampusOverview } from "../../components/dashboard/campus-overview";
import { EventsList } from "../../components/dashboard/events-list";
import { PageHeader } from "../../components/dashboard/page-header";
import { RoomsGrid } from "../../components/rooms/rooms-grid";
import { ErrorState, LoadingState } from "../../components/shared/data-state";
import { ScheduleList } from "../../components/schedule/schedule-list";
import { useCampusData } from "../../hooks/useCampusData";

const viewCopy: Record<DashboardView, [string, string]> = {
  overview: ["Campus overview", "A live snapshot of classes, spaces, deadlines, and notices."],
  schedule: ["Class schedule", "Your enrolled courses for Fall 2026."],
  rooms: ["Rooms & facilities", "Capacity, equipment, and current operating status."],
  events: ["Campus events", "Upcoming talks, workshops, and community activities."],
  assignments: ["Assignments", "Deadlines and submission status across your courses."],
  announcements: ["Announcements", "Active notices from departments and campus services."],
  assistant: ["AI assistant", "Ask a question; CampusOS will select the right live service tools."]
};

export function CampusDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const { data, isLoading, error, refresh } = useCampusData();
  const [title, description] = viewCopy[activeView];

  let content = null;
  if (activeView === "assistant") content = <AiAssistant />;
  else if (isLoading) content = <LoadingState />;
  else if (error) content = <ErrorState message={error} onRetry={() => void refresh()} />;
  else if (activeView === "overview") content = <CampusOverview data={data} onViewChange={setActiveView} />;
  else if (activeView === "schedule") content = <section className="rounded-lg border bg-card p-5"><ScheduleList schedules={data.schedules} /></section>;
  else if (activeView === "rooms") content = <RoomsGrid rooms={data.rooms} />;
  else if (activeView === "events") content = <EventsList events={data.events} />;
  else if (activeView === "assignments") content = <AssignmentsList assignments={data.assignments} />;
  else content = <AnnouncementsList announcements={data.announcements} />;

  return <AppShell activeView={activeView} onViewChange={setActiveView}><PageHeader title={title} description={description} onRefresh={() => void refresh()} isRefreshing={isLoading} /><div className="p-4 sm:p-5 lg:p-8">{content}</div></AppShell>;
}
