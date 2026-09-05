export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode === 404 ? 'not_found' : statusCode === 409 ? 'conflict' : statusCode === 400 ? 'bad_request' : 'internal_error');

  console.error(`[Error] ${req.method} ${req.url} -> ${statusCode} (${errorCode}):`, err.message);

  res.status(statusCode).json({
    error: errorCode,
    message: err.message || 'An unexpected error occurred',
    ...(err.conflictingBooking ? { conflictingBooking: err.conflictingBooking } : {})
  });
}
