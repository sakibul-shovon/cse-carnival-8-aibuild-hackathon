import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const campusRecords = sqliteTable(
  'campus_records',
  {
    id: text('id').primaryKey().notNull(),
    system: text('system').notNull(),
    data: text('data').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_campus_records_system').on(table.system)],
);

export const users = sqliteTable('users', {
  id: text('id').primaryKey().notNull(),
  fullName: text('full_name').notNull(),
  studentId: text('student_id').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  passwordSalt: text('password_salt').notNull(),
  department: text('department').notNull(),
  semester: text('semester').notNull(),
  role: text('role', { enum: ['student', 'admin'] }).notNull().default('student'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const userSessions = sqliteTable(
  'user_sessions',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_user_sessions_user_id').on(table.userId), index('idx_user_sessions_expires_at').on(table.expiresAt)],
);
