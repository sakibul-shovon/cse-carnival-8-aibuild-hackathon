import cron, { type ScheduledTask } from "node-cron";
import { notificationService } from "./notification.service.js";

/** Every 15 minutes: "0,15,30,45 * * * *" — runs at :00, :15, :30, :45. */
const SWEEP_CRON_EXPRESSION = "*/15 * * * *";

let task: ScheduledTask | undefined;

async function runSweepSafely(): Promise<void> {
  try {
    const result = await notificationService.runSweep();
    console.info(
      `[notification.scheduler] sweep complete: checked ${result.assignmentsChecked} assignment(s), ` +
        `${result.eventsChecked} event(s), ${result.announcementsChecked} announcement(s); ` +
        `created ${result.notificationsCreated} notification(s) at ${result.runAt}`
    );
  } catch (error) {
    console.error("[notification.scheduler] sweep failed", error);
  }
}

export const notificationScheduler = {
  /** Starts the recurring sweep. Safe to call once at process start. */
  start(): ScheduledTask {
    if (task) return task;
    task = cron.schedule(SWEEP_CRON_EXPRESSION, () => void runSweepSafely());
    console.info(`[notification.scheduler] started (cron: "${SWEEP_CRON_EXPRESSION}")`);
    return task;
  },

  /** Stops the recurring sweep. Used on process shutdown and in tests. */
  stop(): void {
    task?.stop();
    task = undefined;
  },

  /** Runs one sweep immediately, bypassing the cron schedule. Used to warm data on boot and in tests. */
  runOnce(): Promise<void> {
    return runSweepSafely();
  }
};
