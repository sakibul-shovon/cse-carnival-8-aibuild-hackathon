import express from 'express';

const router = express.Router();

// POST /api/agent/chat
// Scaffold endpoint for Member 3's AI Agent implementation
router.post('/chat', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({
        error: 'missing_message',
        message: 'A user message string is required in body: { message }'
      });
    }

    // Default scaffold response until Member 3 attaches LLM tool orchestrator
    res.json({
      reply: `[CampusOS Agent Scaffold] Received: "${message}". Ready for Member 3 LLM tool integration.`,
      actions_taken: [],
      history: [...history, { role: 'user', content: message }]
    });
  } catch (err) {
    next(err);
  }
});

export default router;
