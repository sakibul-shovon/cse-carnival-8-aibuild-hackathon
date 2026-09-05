import express from 'express';

const router = express.Router();

import { chat } from '../agent/index.js';

// POST /api/agent/chat
// AI Agent endpoint with tool-calling and reasoning
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({
        error: 'missing_message',
        message: 'A user message string is required in body: { message }'
      });
    }

    const response = await chat(message, history);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
