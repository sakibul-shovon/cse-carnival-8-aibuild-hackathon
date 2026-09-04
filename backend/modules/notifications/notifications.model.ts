import { database } from "../../config/database.js";
import type { NotificationInput, NotificationListQuery, NotificationUpdateInput } from "./notifications.validation.js";

export const notificationsModel = {
  findMany(externalUserId: string, query: NotificationListQuery) {
    return database.notification.findMany({
      where: { user: { externalId: externalUserId }, status: query.status, sourceType: query.sourceType },
      orderBy: [{ status: "asc" }, { sendAt: "desc" }],
      take: query.limit
    });
  },
  findById(id: string, externalUserId: string) {
    return database.notification.findFirst({ where: { id, user: { externalId: externalUserId } } });
  },
  create(input: NotificationInput) {
    return database.notification.create({
      data: {
        user: { connect: { externalId: input.userId } }, sourceType: input.sourceType, sourceId: input.sourceId,
        message: input.message, sendAt: new Date(input.sendAt), status: input.status
      }
    });
  },
  update(id: string, input: NotificationUpdateInput) {
    return database.notification.update({
      where: { id },
      data: {
        sourceType: input.sourceType, sourceId: input.sourceId, message: input.message,
        sendAt: input.sendAt ? new Date(input.sendAt) : undefined, status: input.status
      }
    });
  },
  delete(id: string) { return database.notification.delete({ where: { id } }); }
};
