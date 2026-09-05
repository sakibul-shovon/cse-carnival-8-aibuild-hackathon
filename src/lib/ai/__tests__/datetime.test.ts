import { describe, expect, it } from "vitest";
import { getCampusNow } from "../datetime";

describe("getCampusNow", () => {
  it("resolves date/time in the campus timezone", () => {
    // 2026-09-04T04:30Z = 10:30 in Asia/Dhaka (UTC+6)
    const now = getCampusNow("Asia/Dhaka", new Date("2026-09-04T04:30:00Z"));
    expect(now).toMatchObject({ date: "2026-09-04", time: "10:30", weekday: "Friday", timezone: "Asia/Dhaka" });
  });

  it("rolls the date over at the timezone boundary", () => {
    // 2026-09-04T20:00Z = 02:00 on 09-05 in Dhaka
    const now = getCampusNow("Asia/Dhaka", new Date("2026-09-04T20:00:00Z"));
    expect(now).toMatchObject({ date: "2026-09-05", time: "02:00", weekday: "Saturday" });
  });

  it("computes the Sunday–Thursday university week", () => {
    const wed = getCampusNow("Asia/Dhaka", new Date("2026-09-09T06:00:00Z"));
    expect(wed).toMatchObject({ weekday: "Wednesday", weekStart: "2026-09-06", weekEnd: "2026-09-10" });

    const sun = getCampusNow("Asia/Dhaka", new Date("2026-09-06T06:00:00Z"));
    expect(sun).toMatchObject({ weekday: "Sunday", weekStart: "2026-09-06", weekEnd: "2026-09-10" });

    // Friday belongs to the week that just ended
    const fri = getCampusNow("Asia/Dhaka", new Date("2026-09-04T06:00:00Z"));
    expect(fri).toMatchObject({ weekday: "Friday", weekStart: "2026-08-30", weekEnd: "2026-09-03" });
  });
});
