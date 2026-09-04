import { runCampusAgent } from '../services/aiService.js'

export async function chat(request, response, next) {
  try {
    const { message, history = [] } = request.body ?? {}
    if (typeof message !== 'string' || !message.trim()) {
      return response.status(400).json({ success: false, error: 'message is required' })
    }
    const answer = await runCampusAgent(message.trim(), Array.isArray(history) ? history : [])
    return response.json({ success: true, data: { message: answer } })
  } catch (error) {
    return next(error)
  }
}
