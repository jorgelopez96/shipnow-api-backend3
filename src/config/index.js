import { env, envErrors } from './env.loader.js';

if (envErrors.length > 0) {
  throw new Error(`Configuración inválida: ${envErrors.join('; ')}. Revisá tu .env (podés partir de .env.example).`);
}

export const config = env;
