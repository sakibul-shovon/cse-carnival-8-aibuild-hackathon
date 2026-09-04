import type { Metadata } from "next";
import { Bot } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "AI Agent",
};

export default function AiAgentPage() {
  return (
    <>
      <PageHeader
        title="AI Agent"
        description="Ask CampusOS about your schedule, rooms, events, announcements, and assignments."
      />
      <Card className="border-ai/20">
        <CardContent>
          <EmptyState
            icon={Bot}
            title="The AI Agent isn't wired up yet"
            description="The chat interface will live here. Once the agent is connected, you'll be able to ask questions and take actions on live campus data."
            className="border-0 bg-transparent"
          />
        </CardContent>
      </Card>
    </>
  );
}
