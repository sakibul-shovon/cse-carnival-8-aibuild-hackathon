export type ServiceResponse<T> = {
  data: T | null;
  error: string | null;
};

export function successResponse<T>(data: T): ServiceResponse<T> {
  return { data, error: null };
}

export function errorResponse<T = any>(error: string | Error): ServiceResponse<T> {
  const errorMessage = error instanceof Error ? error.message : error;
  return { data: null, error: errorMessage };
}
