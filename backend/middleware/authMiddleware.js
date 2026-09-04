import { getUserById, verifyToken } from '../services/authService.js'

export async function requireAuth(request, _response, next) {
  try {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) throw new Error('Authentication required')
    const payload = verifyToken(header.slice(7))
    request.user = await getUserById(payload.sub)
    next()
  } catch (error) { next(error) }
}

export function requireRole(role) {
  return (request, _response, next) => request.user?.role === role ? next() : next(Object.assign(new Error(`This account is not a ${role} account`), { statusCode: 403 }))
}
