import type { Response } from "express";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  message = "Operation successful",
  statusCode = 200
): Response<ApiResponse<T>> {
  return response.status(statusCode).json({ success: true, data, message });
}
