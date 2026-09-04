import { database } from "../../config/database.js";
import type { AnnouncementInput, AnnouncementListQuery, AnnouncementUpdateInput } from "./announcements.validation.js";

export const announcementsModel = {
  findMany(query: AnnouncementListQuery = {}) {
    return database.announcement.findMany({
      where: {
        priority: query.priority,
        ...(query.activeOnly ? { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] } : {})
      },
      orderBy: [{ priority: "desc" }, { publishedAt: "desc" }]
    });
  },
  findById(id: string) { return database.announcement.findUnique({ where: { id } }); },
  create(input: AnnouncementInput) {
    return database.announcement.create({
      data: {
        title: input.title, body: input.body, priority: input.priority, postedBy: input.postedBy,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      }
    });
  },
  update(id: string, input: AnnouncementUpdateInput) {
    return database.announcement.update({
      where: { id },
      data: {
        title: input.title, body: input.body, priority: input.priority, postedBy: input.postedBy,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
        expiresAt: input.expiresAt === null ? null : input.expiresAt ? new Date(input.expiresAt) : undefined
      }
    });
  },
  delete(id: string) { return database.announcement.delete({ where: { id } }); }
};
