import { database } from "../../config/database.js";
import type { UserInput, UserListQuery, UserUpdateInput } from "./users.validation.js";

export const usersModel = {
  findMany(query: UserListQuery = {}) { return database.user.findMany({ where: { role: query.role }, orderBy: { name: "asc" } }); },
  findById(id: string) { return database.user.findFirst({ where: { OR: [{ id }, { externalId: id }] } }); },
  create(input: UserInput) { return database.user.create({ data: input }); },
  update(id: string, input: UserUpdateInput) { return database.user.update({ where: { id }, data: input }); },
  delete(id: string) { return database.user.delete({ where: { id } }); }
};
