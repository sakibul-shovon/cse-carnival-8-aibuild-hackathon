import { getUserById, login, registerStudent } from '../services/authService.js'

export async function register(request, response, next) {
  try { response.status(201).json({ success: true, data: await registerStudent(request.body ?? {}) }) } catch (error) { next(error) }
}

export async function signIn(request, response, next) {
  try { response.json({ success: true, data: await login(request.body ?? {}) }) } catch (error) { next(error) }
}

export async function me(request, response, next) {
  try { response.json({ success: true, data: { user: await getUserById(request.user.id) } }) } catch (error) { next(error) }
}
