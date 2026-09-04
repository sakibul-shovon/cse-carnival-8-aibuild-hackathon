CREATE TABLE IF NOT EXISTS `campus_records` (
	`id` text PRIMARY KEY NOT NULL,
	`system` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_campus_records_system` ON `campus_records` (`system`);
--> statement-breakpoint
PRAGMA optimize;
