export function getHealthStatus() {
  return {
    service: 'CampusOS API',
    status: 'ok',
    timestamp: new Date().toISOString(),
  }
}
