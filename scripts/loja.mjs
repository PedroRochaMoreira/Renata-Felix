#!/usr/bin/env node
/**
 * Operação da loja pela linha de comando, no lugar do painel administrativo.
 * Fala com as rotas /api/admin usando a sessão de uma conta administradora.
 *
 *   node scripts/loja.mjs pedidos
 *   node scripts/loja.mjs estoque
 *   node scripts/loja.mjs repor <peça> <tamanho> <cor> <quantidade>
 *   node scripts/loja.mjs destaques <peça> [peça...]
 *
 * Configure RF_BASE_URL, RF_EMAIL e RF_SENHA no ambiente.
 */
const base = (process.env.RF_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const email = process.env.RF_EMAIL;
const senha = process.env.RF_SENHA;

const dinheiro = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function entrar() {
  if (!email || !senha) {
    throw new Error('Defina RF_EMAIL e RF_SENHA com uma conta administradora da loja.');
  }
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Não foi possível entrar com essa conta.');
  }
  const cookie = response.headers.get('set-cookie');
  if (!cookie) throw new Error('A loja não devolveu a sessão.');
  return cookie.split(';')[0];
}

async function chamar(caminho, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}${caminho}`, {
    method,
    headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `A loja respondeu ${response.status}.`);
  return data;
}

const comandos = {
  async pedidos(_args, cookie) {
    const { orders } = await chamar('/api/admin/orders', { cookie });
    if (!orders.length) return console.log('Nenhum pedido ainda.');
    for (const order of orders) {
      const cliente = order.customer ? `${order.customer.name} <${order.customer.email}>` : 'cliente removida';
      console.log(`${order.id}  ${order.status.padEnd(9)}  ${dinheiro(order.total).padStart(12)}  ${cliente}`);
      for (const item of order.items) {
        console.log(`    ${item.quantity}x ${item.name} · ${item.color || 'sem cor'} · ${item.size}`);
      }
    }
  },

  async estoque(_args, cookie) {
    const { products } = await chamar('/api/catalog', { cookie });
    for (const product of products) {
      console.log(`\n${product.name}  (${product.id})  total ${product.stock}`);
      for (const variant of product.variants || []) {
        const marca = variant.stock === 0 ? '  ESGOTADO' : '';
        console.log(`    ${variant.color} · ${variant.size}: ${variant.stock}${marca}`);
      }
    }
  },

  async repor(args, cookie) {
    const [id, size, color, quantidade] = args;
    if (!id || !size || !color || quantidade === undefined) {
      throw new Error('Uso: repor <peça> <tamanho> <cor> <quantidade>');
    }
    const data = await chamar('/api/admin/inventory', {
      method: 'PATCH',
      cookie,
      body: { id, size, color, stock: Number(quantidade) },
    });
    console.log(`Estoque atualizado. ${data.notified ? `${data.notified} cliente(s) avisada(s) que a peça voltou.` : ''}`);
  },

  async destaques(args, cookie) {
    if (!args.length) {
      const { ids } = await chamar('/api/admin/featured', { cookie });
      return console.log(ids.length ? ids.join('\n') : 'Nenhuma peça em destaque.');
    }
    await chamar('/api/admin/featured', { method: 'PUT', cookie, body: { ids: args.slice(0, 4) } });
    console.log('Vitrine atualizada.');
  },
};

const [comando, ...args] = process.argv.slice(2);
const escolhido = comandos[comando];

if (!escolhido) {
  console.log('Comandos: pedidos | estoque | repor | destaques');
  process.exit(comando ? 1 : 0);
}

try {
  await escolhido(args, await entrar());
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
