/**
 * Real-provider smoke test for the agent loop. Requires OPENAI_API_KEY (or
 * LLM_PROVIDER=groq + GROQ_API_KEY) in .env. Run: npm run ai:smoke
 */
import "dotenv/config";
import { runAgent } from "@/lib/ai/agent";
import { getProvider } from "@/lib/ai/provider";

async function ask(prompt: string) {
  console.log(`\n> ${prompt}`);
  const out = await runAgent({ messages: [{ role: "user", content: prompt }] });
  for (const ev of out.toolEvents) console.log(`  [tool] ${ev.name}(${JSON.stringify(ev.args)}) → ${ev.status}: ${ev.summary}`);
  console.log(`  ${out.reply.replace(/\n/g, "\n  ")}`);
  return out;
}

async function main() {
  const provider = getProvider();
  console.log(`Provider: ${provider.name} / ${provider.model}`);

  const a = await ask("What day and time is it right now on campus? Please double-check with your tools.");
  if (a.toolEvents.length === 0) console.warn("  (model answered from the system prompt clock without calling the tool — acceptable)");

  const b = await ask("What classes do I have on Wednesday?");
  const lower = b.reply.toLowerCase();
  const invented = /\b(cse|room 7[abc]\d\d|\d{1,2}:\d{2})\b/.test(lower);
  console.log(invented ? "  !! WARNING: reply may contain invented schedule data" : "  ok: no schedule data invented");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
