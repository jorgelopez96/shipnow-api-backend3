import { format } from 'winston';
import { maskMongoUri } from '../utils/mask-mongo-uri.js';

const SENSITIVE_KEY = /password|passwd|token|authorization|secret/i;
const REDACTED = '[REDACTED]';
const MAX_DEPTH = 5;

const redact = (value, depth = 0) => {
  if (typeof value === 'string') return maskMongoUri(value);
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  const source = typeof value.toJSON === 'function' ? value.toJSON() : value;
  if (source === null || typeof source !== 'object') return redact(source, depth + 1);
  return Object.fromEntries(
    Object.entries(source).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1)])
  );
};

export const redactSensitive = format((info) => {
  for (const key of Object.keys(info)) {
    info[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(info[key]);
  }
  return info;
});
