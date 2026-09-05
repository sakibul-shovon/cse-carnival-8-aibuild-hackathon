import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 CampusOS API Server running on port ${config.port}`);
  console.log(`📡 Base API URL: http://localhost:${config.port}/api`);
  console.log(`🩺 Health check: http://localhost:${config.port}/api/health`);
});
