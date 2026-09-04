import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { usersService } from "./users.service.js";
import type { UserInput, UserListQuery, UserUpdateInput } from "./users.validation.js";

export const usersController = {
  async list(request: Request, response: Response) { return sendSuccess(response, await usersService.list(request.query as UserListQuery), "Users retrieved"); },
  async get(request: Request, response: Response) { return sendSuccess(response, await usersService.getById(request.params.id as string), "User retrieved"); },
  async create(request: Request, response: Response) { return sendSuccess(response, await usersService.create(request.body as UserInput), "User created", 201); },
  async update(request: Request, response: Response) { return sendSuccess(response, await usersService.update(request.params.id as string, request.body as UserUpdateInput), "User updated"); },
  async remove(request: Request, response: Response) { await usersService.remove(request.params.id as string); return sendSuccess(response, null, "User deleted"); }
};
