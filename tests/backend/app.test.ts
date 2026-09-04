import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../backend/app.js";

describe("CampusOS API", () => {
  it("returns the shared success envelope from health", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ success: true, data: { status: "ok" }, message: "CampusOS API is healthy" });
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("returns the shared error envelope for unknown routes", async () => {
    const response = await request(app).get("/missing").expect(404);
    expect(response.body).toMatchObject({ success: false, data: null, error: { code: "ROUTE_NOT_FOUND" } });
  });

  it("rejects invalid AI messages before invoking OpenAI", async () => {
    const response = await request(app).post("/api/v1/ai/chat").send({ message: "" }).expect(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
