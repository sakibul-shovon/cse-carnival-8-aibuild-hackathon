import { orchestrator } from './orchestrator.js';

export async function chat(message, history = []) {
  return await orchestrator.runAgent({ message, history });
}

export { orchestrator };
