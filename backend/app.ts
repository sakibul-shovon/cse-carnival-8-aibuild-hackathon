import { randomUUID } from "node:crypto";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { aiRouter } from "./ai/ai.routes.js";
import { environment } from "./config/environment.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { announcementsRouter } from "./modules/announcements/announcements.routes.js";
import { assignmentsRouter } from "./modules/assignments/assignments.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { notificationsRouter } from "./modules/notifications/notifications.routes.js";
import { roomsRouter } from "./modules/rooms/rooms.routes.js";
import { scheduleRouter } from "./modules/schedule/schedule.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { sendSuccess } from "./utils/apiResponse.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: environment.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(environment.NODE_ENV === "production" ? "combined" : "dev"));
app.use((request, response, next) => {
  response.setHeader("x-request-id", request.header("x-request-id") || randomUUID());
  next();
});

app.get("/health", (_request, response) => sendSuccess(response, { status: "ok" }, "CampusOS API is healthy"));

app.use("/api/v1", authMiddleware);
app.use("/api/v1/schedules", scheduleRouter);
app.use("/api/v1/rooms", roomsRouter);
app.use("/api/v1/events", eventsRouter);
app.use("/api/v1/assignments", assignmentsRouter);
app.use("/api/v1/announcements", announcementsRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/ai", aiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
