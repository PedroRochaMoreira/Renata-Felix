type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();

export function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = entries.get(key);
  if (!entry || entry.resetAt <= now) { entries.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export function requestClientKey(request: Request) { return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous'; }
