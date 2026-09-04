import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { environment } from "../config/environment.js";
import { AppError } from "../utils/AppError.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(`Route ${request.method} ${request.originalUrl} was not found`, 404, "ROUTE_NOT_FOUND"));
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(422).json({
      success: false,
      data: null,
      message: "Request validation failed",
      error: { code: "VALIDATION_ERROR", details: error.flatten() }
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const isConflict = error.code === "P2002";
    response.status(isConflict ? 409 : 400).json({
      success: false,
      data: null,
      message: isConflict ? "A record with those values already exists" : "Database request failed",
      error: { code: error.code }
    });
    return;
  }

  const appError = error instanceof AppError ? error : new AppError("An unexpected error occurred");
  response.status(appError.statusCode).json({
    success: false,
    data: null,
    message: appError.message,
    error: {
      code: appError.code,
      ...(appError.details ? { details: appError.details } : {}),
      ...(environment.NODE_ENV === "development" && !(error instanceof AppError)
        ? { stack: error instanceof Error ? error.stack : undefined }
        : {})
    }
  });
};
