import { app } from "./app.js";
import { database } from "./config/database.js";
import { environment } from "./config/environment.js";
import { notificationScheduler } from "./modules/notifications/notification.scheduler.js";

const server = app.listen(environment.BACKEND_PORT, () => {
  console.info(`CampusOS API listening on http://localhost:${environment.BACKEND_PORT}`);
  notificationScheduler.start();
});

async function shutdown(signal: string): Promise<void> {
  console.info(`${signal} received; closing CampusOS API`);
  notificationScheduler.stop();
  server.close(async () => {
    await database.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
