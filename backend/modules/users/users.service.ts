import { AppError } from "../../utils/AppError.js";
import { usersModel } from "./users.model.js";
import type { UserInput, UserListQuery, UserUpdateInput } from "./users.validation.js";

export const usersService = {
  list(query: UserListQuery = {}) { return usersModel.findMany(query); },
  async getById(id: string) {
    const user = await usersModel.findById(id);
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    return user;
  },
  create(input: UserInput) { return usersModel.create(input); },
  async update(id: string, input: UserUpdateInput) { const user = await this.getById(id); return usersModel.update(user.id, input); },
  async remove(id: string) { const user = await this.getById(id); await usersModel.delete(user.id); }
};
