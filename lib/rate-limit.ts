import { consumeRateLimit, pruneRateLimits, rateLimitStorageReady } from './store';

type Entry = { count: number; resetAt: number };

const entries = new Map<string, Entry>();
let nextPrune = 0;

/**
 * Contagem local, usada em desenvolvimento e como rede de segurança quando o
 * banco não responde. Sozinha ela não protege a produção: cada instância da
 * Vercel teria o seu próprio contador.
 */
function consumeInMemory(key: string, windowMs: number) {
  const now = Date.now();
  const entry = entries.get(key);
  if (!entry || entry.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/** Remove de tempos em tempos as janelas vencidas guardadas no banco. */
async function pruneOccasionally() {
  const now = Date.now();
  if (now < nextPrune) return;
  nextPrune = now + 60 * 60 * 1000;
  await pruneRateLimits().catch(() => undefined);
}

/**
 * Retorna `false` quando a tentativa deve ser recusada. O contador fica no
 * banco sempre que ele estiver configurado, para valer entre as instâncias.
 */
export async function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  if (!rateLimitStorageReady()) return consumeInMemory(key, windowMs) <= limit;
  try {
    const [count] = await Promise.all([consumeRateLimit(key, windowMs), pruneOccasionally()]);
    return count <= limit;
  } catch {
    // Uma indisponibilidade do banco não pode derrubar o login da loja, mas
    // também não pode liberar tentativas sem limite nenhum.
    console.error(`Não foi possível registrar a tentativa "${key}" no banco. Usando a contagem local.`);
    return consumeInMemory(key, windowMs) <= limit;
  }
}

export function requestClientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
}
