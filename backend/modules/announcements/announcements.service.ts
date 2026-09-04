import { AppError } from "../../utils/AppError.js";
import { announcementsModel } from "./announcements.model.js";
import type { AnnouncementInput, AnnouncementListQuery, AnnouncementUpdateInput } from "./announcements.validation.js";

export const announcementsService = {
  list(query: AnnouncementListQuery = {}) { return announcementsModel.findMany(query); },
  async getById(id: string) {
    const announcement = await announcementsModel.findById(id);
    if (!announcement) throw new AppError("Announcement not found", 404, "ANNOUNCEMENT_NOT_FOUND");
    return announcement;
  },
  create(input: AnnouncementInput) { return announcementsModel.create(input); },
  async update(id: string, input: AnnouncementUpdateInput) { await this.getById(id); return announcementsModel.update(id, input); },
  async remove(id: string) { await this.getById(id); await announcementsModel.delete(id); }
};
