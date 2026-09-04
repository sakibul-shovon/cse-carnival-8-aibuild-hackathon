CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `full_name` text NOT NULL,
  `student_id` text NOT NULL UNIQUE,
  `email` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `password_salt` text NOT NULL,
  `department` text NOT NULL,
  `semester` text NOT NULL,
  `role` text NOT NULL DEFAULT 'student' CHECK (`role` IN ('student', 'admin')),
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_user_sessions_user_id` ON `user_sessions` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_user_sessions_expires_at` ON `user_sessions` (`expires_at`);
