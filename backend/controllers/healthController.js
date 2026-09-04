import { testConnection } from '../db.js'

export async function getHealth(_request, response, next) {
  try {
    await testConnection()
    response.json({ success: true, message: 'CampusOS API is running', database: 'connected' })
  } catch (error) {
    next(error)
  }
}
