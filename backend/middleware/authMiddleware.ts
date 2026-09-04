import type { NextFunction, Request, Response } from "express";
import { environment } from "../config/environment.js";

export interface AuthenticatedRequest extends Request {
  auth: {
    userId: string;
  };
}

export function authMiddleware(request: Request, _response: Response, next: NextFunction): void {
  const headerUserId = request.header("x-user-id")?.trim();
  (request as AuthenticatedRequest).auth = { userId: headerUserId || environment.DEV_USER_ID };
  next();
}
