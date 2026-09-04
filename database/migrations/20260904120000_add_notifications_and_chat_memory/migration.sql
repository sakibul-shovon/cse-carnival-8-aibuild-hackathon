-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `source_type` ENUM('ANNOUNCEMENT', 'ASSIGNMENT', 'EVENT', 'ROOM_BOOKING', 'SCHEDULE', 'SYSTEM') NOT NULL,
    `source_id` VARCHAR(36) NULL,
    `message` VARCHAR(500) NOT NULL,
    `send_at` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'READ', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_user_id_status_send_at_idx`(`user_id`, `status`, `send_at`),
    INDEX `notifications_send_at_status_idx`(`send_at`, `status`),
    INDEX `notifications_source_type_source_id_idx`(`source_type`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_memory` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `role` ENUM('USER', 'ASSISTANT') NOT NULL,
    `content` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `chat_memory_session_id_created_at_idx`(`session_id`, `created_at`),
    INDEX `chat_memory_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_memory` ADD CONSTRAINT `chat_memory_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

