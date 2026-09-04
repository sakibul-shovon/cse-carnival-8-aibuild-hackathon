import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export interface RequestSchema {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validateRequest(schema: RequestSchema) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (schema.body) request.body = schema.body.parse(request.body);
    if (schema.params) request.params = schema.params.parse(request.params);
    if (schema.query) request.query = schema.query.parse(request.query);
    next();
  };
}
