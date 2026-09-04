-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(36) NOT NULL,
    `external_id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `role` ENUM('STUDENT', 'FACULTY', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_external_id_key`(`external_id`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(24) NOT NULL,
    `title` VARCHAR(190) NOT NULL,
    `department` VARCHAR(80) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `courses_code_key`(`code`),
    INDEX `courses_department_idx`(`department`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_enrollments` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `course_id` VARCHAR(36) NOT NULL,
    `section` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `course_enrollments_course_id_section_idx`(`course_id`, `section`),
    UNIQUE INDEX `course_enrollments_user_id_course_id_section_key`(`user_id`, `course_id`, `section`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` VARCHAR(36) NOT NULL,
    `number` VARCHAR(20) NOT NULL,
    `type` ENUM('CLASSROOM', 'LAB', 'SEMINAR', 'AUDITORIUM', 'STUDY') NOT NULL,
    `capacity` INTEGER NOT NULL,
    `floor` INTEGER NOT NULL,
    `status` ENUM('AVAILABLE', 'MAINTENANCE', 'CLOSED') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rooms_number_key`(`number`),
    INDEX `rooms_type_capacity_status_idx`(`type`, `capacity`, `status`),
    INDEX `rooms_floor_idx`(`floor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_features` (
    `id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    INDEX `room_features_name_idx`(`name`),
    UNIQUE INDEX `room_features_room_id_name_key`(`room_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedules` (
    `id` VARCHAR(36) NOT NULL,
    `course_id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `day_of_week` ENUM('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `instructor` VARCHAR(120) NOT NULL,
    `section` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(40) NOT NULL DEFAULT 'Fall 2026',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `schedules_day_of_week_start_time_idx`(`day_of_week`, `start_time`),
    INDEX `schedules_course_id_section_idx`(`course_id`, `section`),
    INDEX `schedules_room_id_day_of_week_start_time_end_time_idx`(`room_id`, `day_of_week`, `start_time`, `end_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_bookings` (
    `id` VARCHAR(36) NOT NULL,
    `room_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NULL,
    `booked_by` VARCHAR(120) NOT NULL,
    `purpose` VARCHAR(255) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_bookings_room_id_starts_at_ends_at_idx`(`room_id`, `starts_at`, `ends_at`),
    INDEX `room_bookings_user_id_starts_at_idx`(`user_id`, `starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campus_events` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(190) NOT NULL,
    `description` TEXT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `room_id` VARCHAR(36) NULL,
    `venue_label` VARCHAR(120) NOT NULL,
    `organizer` VARCHAR(120) NOT NULL,
    `capacity` INTEGER NOT NULL,
    `status` ENUM('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'UPCOMING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `campus_events_starts_at_status_idx`(`starts_at`, `status`),
    INDEX `campus_events_room_id_starts_at_ends_at_idx`(`room_id`, `starts_at`, `ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_registrations` (
    `id` VARCHAR(36) NOT NULL,
    `event_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_registrations_user_id_registered_at_idx`(`user_id`, `registered_at`),
    UNIQUE INDEX `event_registrations_event_id_user_id_key`(`event_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(190) NOT NULL,
    `body` TEXT NOT NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    `posted_by` VARCHAR(120) NOT NULL,
    `published_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcements_priority_published_at_idx`(`priority`, `published_at`),
    INDEX `announcements_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignments` (
    `id` VARCHAR(36) NOT NULL,
    `course_id` VARCHAR(36) NOT NULL,
    `title` VARCHAR(190) NOT NULL,
    `description` TEXT NULL,
    `assigned_at` DATETIME(3) NOT NULL,
    `due_at` DATETIME(3) NOT NULL,
    `submission_platform` VARCHAR(120) NOT NULL,
    `marks` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assignments_course_id_due_at_idx`(`course_id`, `due_at`),
    INDEX `assignments_due_at_idx`(`due_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assignment_submissions` (
    `id` VARCHAR(36) NOT NULL,
    `assignment_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'GRADED') NOT NULL DEFAULT 'PENDING',
    `submitted_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assignment_submissions_user_id_status_idx`(`user_id`, `status`),
    UNIQUE INDEX `assignment_submissions_assignment_id_user_id_key`(`assignment_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_enrollments` ADD CONSTRAINT `course_enrollments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_features` ADD CONSTRAINT `room_features_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedules` ADD CONSTRAINT `schedules_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_bookings` ADD CONSTRAINT `room_bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campus_events` ADD CONSTRAINT `campus_events_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `campus_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_registrations` ADD CONSTRAINT `event_registrations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_assignment_id_fkey` FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assignment_submissions` ADD CONSTRAINT `assignment_submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
