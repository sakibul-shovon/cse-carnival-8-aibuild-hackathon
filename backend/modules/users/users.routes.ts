import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { usersController } from "./users.controller.js";
import { userBodySchema, userListQuerySchema, userParamsSchema, userUpdateBodySchema } from "./users.validation.js";

export const usersRouter = Router();
usersRouter.get("/", validateRequest({ query: userListQuerySchema }), asyncHandler(usersController.list));
usersRouter.get("/:id", validateRequest({ params: userParamsSchema }), asyncHandler(usersController.get));
usersRouter.post("/", validateRequest({ body: userBodySchema }), asyncHandler(usersController.create));
usersRouter.patch("/:id", validateRequest({ params: userParamsSchema, body: userUpdateBodySchema }), asyncHandler(usersController.update));
usersRouter.delete("/:id", validateRequest({ params: userParamsSchema }), asyncHandler(usersController.remove));
