import type { Metadata } from "next";
import { AiChat } from "@/components/ai/ai-chat";

export const metadata: Metadata = {
  title: "AI Agent",
};

export default function AiAgentPage() {
  return <AiChat />;
}
