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
