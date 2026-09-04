/**
 * Em serverless cada instância tem a sua própria memória e elas reciclam a
 * qualquer momento: um contador em `Map` não limita nada de verdade. Quando um
 * Redis REST (Vercel KV ou Upstash) está configurado, a contagem passa a ser
 * compartilhada entre todas as instâncias — que é o que efetivamente protege
 * login, cadastro e recuperação de senha.
 */
type Entry = { count: number; resetAt: number };

const memory = new Map<string, Entry>();
const restUrl = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const restToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const rateLimitIsShared = Boolean(restUrl && restToken);

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    // Limpeza oportunista: sem ela o Map cresce enquanto a instância viver.
    for (const [item, value] of memory) if (value.resetAt <= now) memory.delete(item);
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

async function sharedLimit(key: string, limit: number, windowMs: number) {
  const seconds = Math.max(1, Math.ceil(windowMs / 1000));
  const response = await fetch(`${restUrl}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${restToken}`, 'Content-Type': 'application/json' },
    // EXPIRE com NX só marca a validade na primeira contagem, preservando a janela.
    body: JSON.stringify([['INCR', key], ['EXPIRE', key, String(seconds), 'NX']]),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Redis respondeu ${response.status}`);
  const data = await response.json() as { result?: unknown }[];
  const count = Number(data?.[0]?.result);
  if (!Number.isFinite(count)) throw new Error('Resposta inesperada do Redis.');
  return count <= limit;
}

/**
 * Devolve `true` quando a requisição pode seguir. Uma indisponibilidade do
 * Redis nunca bloqueia clientes reais: cai para a contagem local, que é
 * parcial, mas melhor do que recusar quem está tentando comprar.
 */
export async function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  if (!rateLimitIsShared) return memoryLimit(key, limit, windowMs);
  try {
    return await sharedLimit(key, limit, windowMs);
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

export function requestClientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
}
