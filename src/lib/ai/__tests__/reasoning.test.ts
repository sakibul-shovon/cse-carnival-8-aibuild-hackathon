import { describe, expect, it } from "vitest";
import { addDays, resolveRelativeDates } from "../datetime";
import { buildSystemPrompt } from "../prompt";
import type { CampusNow } from "@/types/ai";

const friday: CampusNow = {
  date: "2026-09-04", time: "10:30", weekday: "Friday", timezone: "Asia/Dhaka",
  timestamp: "2026-09-04T04:30:00.000Z", weekStart: "2026-08-30", weekEnd: "2026-09-03",
};
const wednesday: CampusNow = {
  date: "2026-09-09", time: "09:00", weekday: "Wednesday", timezone: "Asia/Dhaka",
  timestamp: "2026-09-09T03:00:00.000Z", weekStart: "2026-09-06", weekEnd: "2026-09-10",
};

describe("addDays", () => {
  it("adds and subtracts across month boundaries", () => {
    expect(addDays("2026-09-04", 1)).toBe("2026-09-05");
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-09-04", 7)).toBe("2026-09-11");
  });
});

describe("resolveRelativeDates", () => {
  it("on a weekday, 'this week' contains today", () => {
    const r = resolveRelativeDates(wednesday);
    expect(r).toMatchObject({ today: "2026-09-09", tomorrow: "2026-09-10", yesterday: "2026-09-08" });
    expect(r.thisWeek.start).toBe("2026-09-06");
    expect(r.thisWeek.end).toBe("2026-09-10");
    expect(r.nextWeek.start).toBe("2026-09-13");
    expect(r.thisWeek.days).toHaveLength(5);
    expect(r.thisWeek.days[3]).toEqual({ weekday: "Wednesday", date: "2026-09-09" });
  });

  it("on Friday (weekend), 'this week' rolls forward to the upcoming Sun–Thu", () => {
    const r = resolveRelativeDates(friday);
    expect(r.thisWeek.start).toBe("2026-09-06");
    expect(r.thisWeek.end).toBe("2026-09-10");
    expect(r.nextWeek.start).toBe("2026-09-13");
    expect(r.nextWeek.end).toBe("2026-09-17");
  });
});

describe("buildSystemPrompt", () => {
  it("injects resolved dates and honest capability list", () => {
    const p = buildSystemPrompt({
      now: friday,
      user: { student_id: "20-40532", name: "Sakibul Hassan" },
      toolNames: ["get_schedule", "get_events"],
    });
    expect(p).toContain("tomorrow = 2026-09-05");
    expect(p).toContain("this week"); // academic week line present
    expect(p).toContain("2026-09-06 to 2026-09-10");
    expect(p).toContain("Sakibul Hassan");
    expect(p).toContain("You CAN access");
    expect(p).toContain("You CANNOT yet access"); // book_room etc. not in toolNames
  });
});
