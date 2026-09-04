import { AppError } from "../../utils/AppError.js";
import { notificationsModel } from "./notifications.model.js";
import type { NotificationInput, NotificationListQuery, NotificationUpdateInput } from "./notifications.validation.js";

export const notificationsService = {
  list(externalUserId: string, query: NotificationListQuery) { return notificationsModel.findMany(externalUserId, query); },
  async getById(id: string, externalUserId: string) {
    const notification = await notificationsModel.findById(id, externalUserId);
    if (!notification) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    return notification;
  },
  create(input: NotificationInput) { return notificationsModel.create(input); },
  async update(id: string, externalUserId: string, input: NotificationUpdateInput) {
    await this.getById(id, externalUserId);
    return notificationsModel.update(id, input);
  },
  async remove(id: string, externalUserId: string) {
    await this.getById(id, externalUserId);
    await notificationsModel.delete(id);
  }
};
