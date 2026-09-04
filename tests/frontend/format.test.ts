import { describe, expect, it } from "vitest";
import { formatTime, titleCase } from "../../frontend/utils/format";

describe("frontend format utilities", () => {
  it("formats Prisma TIME values in UTC without timezone drift", () => {
    expect(formatTime("1970-01-01T08:00:00.000Z")).toContain("8:00");
  });

  it("formats enum values for the interface", () => {
    expect(titleCase("IN_PROGRESS")).toBe("In Progress");
  });
});
