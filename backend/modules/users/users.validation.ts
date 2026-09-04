import { z } from "zod";

export const userParamsSchema = z.object({ id: z.string().min(1) });
export const userListQuerySchema = z.object({ role: z.enum(["STUDENT", "FACULTY", "ADMIN"]).optional() });
export const userBodySchema = z.object({
  externalId: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190),
  role: z.enum(["STUDENT", "FACULTY", "ADMIN"]).default("STUDENT")
});
export const userUpdateBodySchema = userBodySchema.partial();
export type UserInput = z.infer<typeof userBodySchema>;
export type UserUpdateInput = z.infer<typeof userUpdateBodySchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
