import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { products as baseProducts } from '../app/data';
import { buildVariants, distributeStock, normalizeColor, normalizeSize, reconcileVariants, totalStock, type Variant } from './variants';
import { isPaymentMethod, type PaymentMethod } from './pricing';

export type StoredProduct = {
  id: string;
  name: string;
  price: number;
  cat: string;
  color: string;
  img: string;
  images?: string[];
  sizes?: string[];
  desc: string;
  tag?: string;
  isNew?: boolean;
  stock?: number;
};

export type Address = { street: string; city: string; postalCode: string; complement?: string };
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  createdAt: string;
  address?: Address;
  emailVerified?: boolean;
};

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type Order = {
  id: string;
  userId: string;
  status: OrderStatus;
  items: { id: string; name: string; size: string; color?: string; quantity: number; unitPrice: number }[];
  shipping?: { name: string; company: string; price: number; deliveryTime?: number };
  subtotal?: number;
  discount?: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentPreferenceId?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
};

type User = PublicUser & { passwordHash: string };
type Session = { token: string; userId: string; expiresAt: string };
type Db = {
  users: User[];
  sessions: Session[];
  products: StoredProduct[];
  featuredIds: string[];
  inventory: Record<string, { stock: number; deleted?: boolean }>;
  variants: Record<string, Variant[]>;
  overrides: Record<string, Partial<StoredProduct>>;
  orders: Order[];
  subscribers: { email: string; createdAt: string }[];
  messages: { id: string; name: string; email: string; subject: string; message: string; createdAt: string }[];
  passwordResetTokens: { tokenHash: string; userId: string; expiresAt: string }[];
  emailVerificationTokens: { tokenHash: string; userId: string; expiresAt: string }[];
  favorites: Record<string, string[]>;
};

type Row = Record<string, unknown>;
type AdminOrder = Order & { customer: PublicUser | null };

const file = path.join(process.cwd(), 'data', 'renata-felix.json');
const empty = (): Db => ({
  users: [], sessions: [], products: [], featuredIds: [], inventory: {}, variants: {}, overrides: {}, orders: [],
  subscribers: [], messages: [], passwordResetTokens: [], emailVerificationTokens: [], favorites: {},
});

const url = process.env.DATABASE_URL;
const sql = url ? neon(url) : null;
let schemaReady: Promise<void> | null = null;

function normalize(db: Partial<Db>): Db {
  return {
    users: db.users || [], sessions: db.sessions || [], products: db.products || [], featuredIds: db.featuredIds || [],
    inventory: db.inventory || {}, variants: db.variants || {}, overrides: db.overrides || {}, orders: db.orders || [], subscribers: db.subscribers || [],
    messages: db.messages || [], passwordResetTokens: db.passwordResetTokens || [],
    emailVerificationTokens: db.emailVerificationTokens || [], favorites: db.favorites || {},
  };
}

function localRead(): Db {
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    const db = empty();
    writeFileSync(file, JSON.stringify(db, null, 2));
    return db;
  }
  return normalize(JSON.parse(readFileSync(file, 'utf8')) as Partial<Db>);
}

function localSave(db: Db) { writeFileSync(file, JSON.stringify(db, null, 2)); }

function asJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return undefined; }
}

function asRecord(value: unknown): Row | undefined {
  const parsed = asJson(value);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Row : undefined;
}

function asStringArray(value: unknown): string[] {
  const parsed = asJson(value);
  return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))] : [];
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asIso(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? new Date().toISOString() : date.toISOString();
}

function readString(value: unknown) { return typeof value === 'string' ? value : ''; }
function readOptionalString(value: unknown) { return typeof value === 'string' && value.length ? value : undefined; }

function database() {
  if (!sql) throw new Error('Banco de dados não configurado.');
  return sql;
}

function fromRowUser(row: Row): User {
  const address = asRecord(row.address);
  return {
    id: readString(row.id),
    name: readString(row.name),
    email: readString(row.email),
    passwordHash: readString(row.password_hash),
    role: row.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    createdAt: asIso(row.created_at),
    address: address ? {
      street: readString(address.street), city: readString(address.city), postalCode: readString(address.postalCode),
      complement: readOptionalString(address.complement),
    } : undefined,
    emailVerified: Boolean(row.email_verified),
  };
}

function fromRowProduct(row: Row): StoredProduct {
  const images = asStringArray(row.images);
  const img = readString(row.img);
  return {
    id: readString(row.id), name: readString(row.name), price: asNumber(row.price), cat: readString(row.category),
    color: readString(row.color), img: images[0] || img, images: images.length ? images : (img ? [img] : []),
    sizes: asStringArray(row.sizes), desc: readString(row.description), tag: readOptionalString(row.tag),
    isNew: Boolean(row.is_new), stock: asNumber(row.stock, 10),
  };
}

function fromRowOrder(row: Row): Order {
  const rawItems = asJson(row.items);
  const items = Array.isArray(rawItems) ? rawItems.map((item): Order['items'][number] => {
    const value = asRecord(item) || {};
    return {
      id: readString(value.id), name: readString(value.name), size: readString(value.size),
      color: readOptionalString(value.color), quantity: Math.max(1, Math.floor(asNumber(value.quantity, 1))), unitPrice: asNumber(value.unitPrice),
    };
  }) : [];
  const rawShipping = asRecord(row.shipping);
  const shipping = rawShipping ? {
    name: readString(rawShipping.name), company: readString(rawShipping.company), price: asNumber(rawShipping.price),
    deliveryTime: rawShipping.deliveryTime === undefined || rawShipping.deliveryTime === null ? undefined : asNumber(rawShipping.deliveryTime),
  } : undefined;
  const status = readString(row.status);
  return {
    id: readString(row.id), userId: readString(row.user_id),
    status: status === 'APPROVED' || status === 'REJECTED' || status === 'CANCELLED' ? status : 'PENDING',
    items, shipping, discount: asNumber(row.discount), total: asNumber(row.total),
    paymentMethod: isPaymentMethod(row.payment_method) ? row.payment_method : 'OTHER',
    paymentPreferenceId: readOptionalString(row.payment_preference_id),
    paymentId: readOptionalString(row.payment_id), createdAt: asIso(row.created_at), updatedAt: asIso(row.updated_at),
  };
}

const maxEmailLength = 254;
const maxNameLength = 120;
const maxAddressFieldLength = 180;
const maxPasswordLength = 256;

function emailIsValid(email: string) { return email.length <= maxEmailLength && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }
function passwordIsStrong(password: string) { return password.length <= maxPasswordLength && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(password); }
function nameIsValid(name: string) { return name.length >= 2 && name.length <= maxNameLength; }
function hashToken(token: string) { return scryptSync(token, 'renata-felix-token', 32).toString('hex'); }
function productId() { return `custom-${randomBytes(8).toString('hex')}`; }

export function publicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

async function migrateLegacyStore() {
  const db = database();
  const marker = await db`SELECT value FROM rf_meta WHERE key = 'legacy-json-v1'`;
  if (marker.length) return;

  let legacy: Db | null = null;
  try {
    const hasLegacy = await db`SELECT to_regclass('public.renata_store') AS name`;
    if (hasLegacy[0]?.name) {
      const rows = await db`SELECT payload FROM renata_store WHERE id = 1`;
      if (rows.length) {
        const payload = asRecord(rows[0].payload);
        if (payload) legacy = normalize(payload as Partial<Db>);
      }
    }
  } catch {
    // A instalação nova não possui o armazenamento JSON antigo.
  }

  if (legacy) {
    for (const user of legacy.users) {
      await db`INSERT INTO rf_users (id, name, email, password_hash, role, created_at, address, email_verified)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${user.passwordHash}, ${user.role}, ${user.createdAt}, ${user.address ? JSON.stringify(user.address) : null}::jsonb, ${Boolean(user.emailVerified)})
        ON CONFLICT (id) DO NOTHING`;
    }
    for (const session of legacy.sessions) {
      await db`INSERT INTO rf_sessions (token, user_id, expires_at) VALUES (${session.token}, ${session.userId}, ${session.expiresAt}) ON CONFLICT (token) DO NOTHING`;
    }
    for (const product of legacy.products) {
      await db`INSERT INTO rf_products (id, name, price, category, color, img, images, sizes, description, tag, is_new, stock, deleted, created_at, updated_at)
        VALUES (${product.id}, ${product.name}, ${product.price}, ${product.cat}, ${product.color}, ${product.img}, ${JSON.stringify(product.images || [product.img])}::jsonb, ${JSON.stringify(product.sizes || [])}::jsonb, ${product.desc}, ${product.tag || null}, ${Boolean(product.isNew)}, ${Math.max(0, Math.floor(product.stock ?? 10))}, FALSE, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING`;
    }
    for (const [id, entry] of Object.entries(legacy.inventory)) {
      await db`INSERT INTO rf_inventory (product_id, stock, deleted) VALUES (${id}, ${Math.max(0, Math.floor(entry.stock))}, ${Boolean(entry.deleted)})
        ON CONFLICT (product_id) DO NOTHING`;
    }
    for (const [id, data] of Object.entries(legacy.overrides)) {
      await db`INSERT INTO rf_product_overrides (product_id, data, updated_at) VALUES (${id}, ${JSON.stringify(data)}::jsonb, NOW()) ON CONFLICT (product_id) DO NOTHING`;
    }
    for (const [position, id] of legacy.featuredIds.entries()) {
      await db`INSERT INTO rf_featured (position, product_id) VALUES (${position}, ${id}) ON CONFLICT DO NOTHING`;
    }
    const legacyUsers = new Set(legacy.users.map(user => user.id));
    for (const order of legacy.orders) {
      if (!legacyUsers.has(order.userId)) continue;
      await db`INSERT INTO rf_orders (id, user_id, status, total, payment_preference_id, payment_id, created_at, updated_at)
        SELECT ${order.id}, ${order.userId}, ${order.status}, ${order.total}, ${order.paymentPreferenceId || null}, ${order.paymentId || null}, ${order.createdAt}, ${order.updatedAt}
        WHERE EXISTS (SELECT 1 FROM rf_users WHERE id = ${order.userId}) ON CONFLICT (id) DO NOTHING`;
      for (const item of order.items) {
        await db`INSERT INTO rf_order_items (order_id, product_id, name, size, color, quantity, unit_price) VALUES (${order.id}, ${item.id}, ${item.name}, ${item.size}, ${item.color || ''}, ${item.quantity}, ${item.unitPrice}) ON CONFLICT DO NOTHING`;
      }
      if (order.shipping) await db`INSERT INTO rf_order_shipping (order_id, name, company, price, delivery_time) VALUES (${order.id}, ${order.shipping.name}, ${order.shipping.company}, ${order.shipping.price}, ${order.shipping.deliveryTime || null}) ON CONFLICT (order_id) DO NOTHING`;
    }
    for (const item of legacy.subscribers) await db`INSERT INTO rf_subscribers (email, created_at) VALUES (${item.email}, ${item.createdAt}) ON CONFLICT (email) DO NOTHING`;
    for (const message of legacy.messages) await db`INSERT INTO rf_messages (id, name, email, subject, message, created_at) VALUES (${message.id}, ${message.name}, ${message.email}, ${message.subject}, ${message.message}, ${message.createdAt}) ON CONFLICT (id) DO NOTHING`;
    for (const item of legacy.passwordResetTokens) await db`INSERT INTO rf_password_reset_tokens (token_hash, user_id, expires_at) VALUES (${item.tokenHash}, ${item.userId}, ${item.expiresAt}) ON CONFLICT (token_hash) DO NOTHING`;
    for (const item of legacy.emailVerificationTokens) await db`INSERT INTO rf_email_verification_tokens (token_hash, user_id, expires_at) VALUES (${item.tokenHash}, ${item.userId}, ${item.expiresAt}) ON CONFLICT (token_hash) DO NOTHING`;
    for (const [userId, ids] of Object.entries(legacy.favorites)) for (const id of ids) await db`INSERT INTO rf_favorites (user_id, product_id) VALUES (${userId}, ${id}) ON CONFLICT DO NOTHING`;
  }
  await db`INSERT INTO rf_meta (key, value) VALUES ('legacy-json-v1', NOW()::text) ON CONFLICT (key) DO NOTHING`;
}

/**
 * O estoque era um número único por peça, o que permitia vender um tamanho
 * esgotado. Esta migração reparte o estoque existente entre as combinações de
 * tamanho e cor sem alterar o total físico. A dona da loja deve revisar a
 * distribuição no painel depois da primeira publicação.
 */
async function migrateVariants() {
  const db = database();
  const marker = await db`SELECT value FROM rf_meta WHERE key = 'variants-v1'`;
  if (marker.length) return;

  const stockRows = await db`SELECT product_id, stock FROM rf_inventory`;
  const legacyStock = new Map((stockRows as Row[]).map(row => [readString(row.product_id), Math.max(0, Math.floor(asNumber(row.stock)))]));
  const overrideRows = await db`SELECT product_id, data FROM rf_product_overrides`;
  const edits = new Map((overrideRows as Row[]).map(row => [readString(row.product_id), (asRecord(row.data) || {}) as Partial<StoredProduct>]));
  const customRows = await db`SELECT * FROM rf_products WHERE deleted = FALSE`;
  const catalog = [...(customRows as Row[]).map(fromRowProduct), ...baseProducts];

  for (const product of catalog) {
    const merged = { ...product, ...edits.get(product.id) } as StoredProduct;
    const total = legacyStock.get(product.id) ?? merged.stock ?? 10;
    for (const variant of buildVariants(merged, total)) {
      await db`INSERT INTO rf_variants (product_id, size, color, stock) VALUES (${product.id}, ${variant.size}, ${variant.color}, ${variant.stock}) ON CONFLICT (product_id, size, color) DO NOTHING`;
    }
  }
  await db`INSERT INTO rf_meta (key, value) VALUES ('variants-v1', NOW()::text) ON CONFLICT (key) DO NOTHING`;
}

async function ensureSchema() {
  if (!sql) return;
  if (!schemaReady) schemaReady = (async () => {
    const db = database();
    const statements = [
      `CREATE TABLE IF NOT EXISTS rf_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS rf_users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('ADMIN','CUSTOMER')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), address JSONB, email_verified BOOLEAN NOT NULL DEFAULT FALSE)`,
      `CREATE TABLE IF NOT EXISTS rf_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES rf_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS rf_sessions_user_idx ON rf_sessions (user_id)`,
      `CREATE TABLE IF NOT EXISTS rf_products (id TEXT PRIMARY KEY, name TEXT NOT NULL, price NUMERIC(12,2) NOT NULL CHECK (price > 0), category TEXT NOT NULL, color TEXT NOT NULL, img TEXT NOT NULL, images JSONB NOT NULL DEFAULT '[]'::jsonb, sizes JSONB NOT NULL DEFAULT '[]'::jsonb, description TEXT NOT NULL, tag TEXT, is_new BOOLEAN NOT NULL DEFAULT FALSE, stock INTEGER NOT NULL DEFAULT 10 CHECK (stock >= 0), deleted BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rf_inventory (product_id TEXT PRIMARY KEY, stock INTEGER NOT NULL CHECK (stock >= 0), deleted BOOLEAN NOT NULL DEFAULT FALSE, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rf_variants (product_id TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL, stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (product_id, size, color))`,
      `CREATE INDEX IF NOT EXISTS rf_variants_product_idx ON rf_variants (product_id)`,
      `CREATE TABLE IF NOT EXISTS rf_product_overrides (product_id TEXT PRIMARY KEY, data JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rf_featured (position SMALLINT PRIMARY KEY CHECK (position BETWEEN 0 AND 3), product_id TEXT NOT NULL UNIQUE)`,
      `CREATE TABLE IF NOT EXISTS rf_orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES rf_users(id), status TEXT NOT NULL CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')), total NUMERIC(12,2) NOT NULL CHECK (total >= 0), payment_preference_id TEXT, payment_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE INDEX IF NOT EXISTS rf_orders_user_idx ON rf_orders (user_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS rf_order_items (id BIGSERIAL PRIMARY KEY, order_id TEXT NOT NULL REFERENCES rf_orders(id) ON DELETE CASCADE, product_id TEXT NOT NULL, name TEXT NOT NULL, size TEXT NOT NULL, color TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL CHECK (quantity > 0), unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0))`,
      `CREATE TABLE IF NOT EXISTS rf_order_shipping (order_id TEXT PRIMARY KEY REFERENCES rf_orders(id) ON DELETE CASCADE, name TEXT NOT NULL, company TEXT NOT NULL, price NUMERIC(12,2) NOT NULL CHECK (price >= 0), delivery_time INTEGER)`,
      `CREATE TABLE IF NOT EXISTS rf_subscribers (email TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rf_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
      `CREATE TABLE IF NOT EXISTS rf_password_reset_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES rf_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS rf_password_reset_user_idx ON rf_password_reset_tokens (user_id)`,
      `CREATE TABLE IF NOT EXISTS rf_email_verification_tokens (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES rf_users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS rf_email_verification_user_idx ON rf_email_verification_tokens (user_id)`,
      `CREATE TABLE IF NOT EXISTS rf_favorites (user_id TEXT NOT NULL REFERENCES rf_users(id) ON DELETE CASCADE, product_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (user_id, product_id))`,
    ];
    for (const statement of statements) await db.query(statement);
    // Existing databases used a unique key that did not include colour. Keep
    // legacy orders untouched while allowing the same size in two real colours.
    await db.query(`ALTER TABLE rf_order_items ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT ''`);
    // Pedidos anteriores ao desconto do PIX nasceram sem método e sem abatimento.
    await db.query(`ALTER TABLE rf_orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'OTHER'`);
    await db.query(`ALTER TABLE rf_orders ADD COLUMN IF NOT EXISTS discount NUMERIC(12,2) NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE rf_order_items DROP CONSTRAINT IF EXISTS rf_order_items_order_id_product_id_size_key`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS rf_order_items_order_product_size_color_idx ON rf_order_items (order_id, product_id, size, color)`);
    await migrateLegacyStore();
    await migrateVariants();
  })();
  await schemaReady;
}

async function databaseOrders(userId?: string): Promise<Order[]> {
  await ensureSchema();
  const db = database();
  const rows = userId
    ? await db`SELECT o.id, o.user_id, o.status, o.total, o.discount, o.payment_method, o.payment_preference_id, o.payment_id, o.created_at, o.updated_at,
        COALESCE(json_agg(json_build_object('id', i.product_id, 'name', i.name, 'size', i.size, 'color', i.color, 'quantity', i.quantity, 'unitPrice', i.unit_price)) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items,
        CASE WHEN s.order_id IS NULL THEN NULL ELSE json_build_object('name', s.name, 'company', s.company, 'price', s.price, 'deliveryTime', s.delivery_time) END AS shipping
        FROM rf_orders o LEFT JOIN rf_order_items i ON i.order_id = o.id LEFT JOIN rf_order_shipping s ON s.order_id = o.id
        WHERE o.user_id = ${userId} GROUP BY o.id, s.order_id, s.name, s.company, s.price, s.delivery_time ORDER BY o.created_at DESC`
    : await db`SELECT o.id, o.user_id, o.status, o.total, o.discount, o.payment_method, o.payment_preference_id, o.payment_id, o.created_at, o.updated_at,
        COALESCE(json_agg(json_build_object('id', i.product_id, 'name', i.name, 'size', i.size, 'color', i.color, 'quantity', i.quantity, 'unitPrice', i.unit_price)) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items,
        CASE WHEN s.order_id IS NULL THEN NULL ELSE json_build_object('name', s.name, 'company', s.company, 'price', s.price, 'deliveryTime', s.delivery_time) END AS shipping
        FROM rf_orders o LEFT JOIN rf_order_items i ON i.order_id = o.id LEFT JOIN rf_order_shipping s ON s.order_id = o.id
        GROUP BY o.id, s.order_id, s.name, s.company, s.price, s.delivery_time ORDER BY o.created_at DESC`;
  return (rows as Row[]).map(fromRowOrder);
}

export async function listProducts() {
  if (!sql) return localRead().products;
  await ensureSchema();
  const rows = await database()`SELECT * FROM rf_products WHERE deleted = FALSE ORDER BY created_at DESC`;
  return (rows as Row[]).map(fromRowProduct);
}

export async function featured() {
  if (!sql) return localRead().featuredIds;
  await ensureSchema();
  const rows = await database()`SELECT product_id FROM rf_featured ORDER BY position ASC`;
  return (rows as Row[]).map(row => readString(row.product_id));
}

export async function inventory() {
  if (!sql) return localRead().inventory;
  await ensureSchema();
  const rows = await database()`SELECT product_id, stock, deleted FROM rf_inventory`;
  return Object.fromEntries((rows as Row[]).map(row => [readString(row.product_id), { stock: Math.max(0, Math.floor(asNumber(row.stock))), deleted: Boolean(row.deleted) }]));
}

export async function overrides() {
  if (!sql) return localRead().overrides;
  await ensureSchema();
  const rows = await database()`SELECT product_id, data FROM rf_product_overrides`;
  return Object.fromEntries((rows as Row[]).map(row => [readString(row.product_id), (asRecord(row.data) || {}) as Partial<StoredProduct>]));
}

/** Mantém o estoque total da peça igual à soma das suas variantes. */
async function syncProductStock(productId: string) {
  const db = database();
  await db`INSERT INTO rf_inventory (product_id, stock, deleted)
    VALUES (${productId}, COALESCE((SELECT SUM(stock)::int FROM rf_variants WHERE product_id = ${productId}), 0), FALSE)
    ON CONFLICT (product_id) DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()`;
  await db`UPDATE rf_products SET stock = COALESCE((SELECT SUM(stock)::int FROM rf_variants WHERE product_id = ${productId}), 0), updated_at = NOW() WHERE id = ${productId}`;
}

function fromRowVariant(row: Row): Variant {
  return {
    size: normalizeSize(readString(row.size)),
    color: normalizeColor(readString(row.color)),
    stock: Math.max(0, Math.floor(asNumber(row.stock))),
  };
}

/** A grade de tamanhos e cores de cada peça, indexada pelo id do produto. */
export async function allVariants(): Promise<Record<string, Variant[]>> {
  if (!sql) return localRead().variants;
  await ensureSchema();
  const rows = await database()`SELECT product_id, size, color, stock FROM rf_variants ORDER BY product_id, color, size`;
  const grouped: Record<string, Variant[]> = {};
  for (const row of rows as Row[]) {
    const id = readString(row.product_id);
    (grouped[id] ||= []).push(fromRowVariant(row));
  }
  return grouped;
}

export async function variantsForProduct(productId: string): Promise<Variant[]> {
  if (!sql) return localRead().variants[productId] || [];
  await ensureSchema();
  const rows = await database()`SELECT product_id, size, color, stock FROM rf_variants WHERE product_id = ${productId} ORDER BY color, size`;
  return (rows as Row[]).map(fromRowVariant);
}

/** Substitui a grade de uma peça e mantém o estoque total espelhado. */
export async function saveProductVariants(productId: string, variants: Variant[]) {
  const clean = variants.map(variant => ({
    size: normalizeSize(variant.size),
    color: normalizeColor(variant.color),
    stock: Math.max(0, Math.floor(asNumber(variant.stock))),
  })).filter(variant => variant.size && variant.color);
  const total = totalStock(clean);

  if (!sql) {
    const local = localRead();
    local.variants[productId] = clean;
    local.inventory[productId] = { ...local.inventory[productId], stock: total };
    const index = local.products.findIndex(product => product.id === productId);
    if (index >= 0) local.products[index] = { ...local.products[index], stock: total };
    localSave(local);
    return clean;
  }

  await ensureSchema();
  const db = database();
  await db.transaction([
    db`DELETE FROM rf_variants WHERE product_id = ${productId}`,
    ...clean.map(variant => db`INSERT INTO rf_variants (product_id, size, color, stock) VALUES (${productId}, ${variant.size}, ${variant.color}, ${variant.stock})`),
    db`INSERT INTO rf_inventory (product_id, stock, deleted) VALUES (${productId}, ${total}, FALSE) ON CONFLICT (product_id) DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()`,
    db`UPDATE rf_products SET stock = ${total}, updated_at = NOW() WHERE id = ${productId}`,
  ]);
  return clean;
}

/** Ajusta o estoque de uma única combinação de tamanho e cor. */
export async function setVariantStock(productId: string, size: string, color: string, stock: number) {
  const current = await variantsForProduct(productId);
  const wantedSize = normalizeSize(size);
  const wantedColor = normalizeColor(color);
  const quantity = Math.max(0, Math.floor(asNumber(stock)));
  const exists = current.some(variant => variant.size === wantedSize && variant.color === wantedColor);
  const next = exists
    ? current.map(variant => variant.size === wantedSize && variant.color === wantedColor ? { ...variant, stock: quantity } : variant)
    : [...current, { size: wantedSize, color: wantedColor, stock: quantity }];
  return saveProductVariants(productId, next);
}

export async function createUser(name: string, email: string, password: string) {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!nameIsValid(cleanName)) throw new Error('Informe seu nome completo com até 120 caracteres.');
  if (!emailIsValid(cleanEmail)) throw new Error('Informe um e-mail válido.');
  if (!passwordIsStrong(password)) throw new Error('A senha deve ter 10 caracteres, com maiúscula, minúscula, número e símbolo.');
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!sql) {
    const local = localRead();
    if (local.users.some(user => user.email === cleanEmail)) throw new Error('Já existe uma conta com este e-mail.');
    const role = ownerEmail ? (cleanEmail === ownerEmail ? 'ADMIN' : 'CUSTOMER') : (local.users.length === 0 ? 'ADMIN' : 'CUSTOMER');
    const user: User = { id: randomBytes(12).toString('hex'), name: cleanName, email: cleanEmail, passwordHash, role, createdAt: new Date().toISOString(), emailVerified: false };
    local.users.push(user); localSave(local); return user;
  }
  await ensureSchema();
  const db = database();
  const existing = await db`SELECT id FROM rf_users WHERE email = ${cleanEmail}`;
  if (existing.length) throw new Error('Já existe uma conta com este e-mail.');
  const countRows = ownerEmail ? [] : await db`SELECT COUNT(*)::int AS count FROM rf_users`;
  const role: PublicUser['role'] = ownerEmail ? (cleanEmail === ownerEmail ? 'ADMIN' : 'CUSTOMER') : (asNumber((countRows[0] as Row | undefined)?.count) === 0 ? 'ADMIN' : 'CUSTOMER');
  const id = randomBytes(12).toString('hex');
  const rows = await db`INSERT INTO rf_users (id, name, email, password_hash, role, email_verified) VALUES (${id}, ${cleanName}, ${cleanEmail}, ${passwordHash}, ${role}, FALSE) RETURNING *`;
  return fromRowUser(rows[0] as Row);
}

export async function validateUser(email: string, password: string) {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const cleanEmail = email.trim().toLowerCase();
  const user = !sql
    ? localRead().users.find(item => item.email === cleanEmail) || null
    : (() => null as User | null)();
  if (!sql) return validatePassword(user, password);
  await ensureSchema();
  const rows = await database()`SELECT * FROM rf_users WHERE email = ${cleanEmail}`;
  return validatePassword(rows.length ? fromRowUser(rows[0] as Row) : null, password);
}

function validatePassword(user: User | null, password: string) {
  if (!user) return null;
  const [salt, hash] = user.passwordHash.split(':');
  if (!salt || !hash) return null;
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate) ? user : null;
}

export async function makeSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  if (!sql) {
    const local = localRead();
    local.sessions = local.sessions.filter(session => new Date(session.expiresAt) > new Date());
    local.sessions.push({ token, userId, expiresAt }); localSave(local); return token;
  }
  await ensureSchema();
  const db = database();
  await db`DELETE FROM rf_sessions WHERE expires_at <= NOW()`;
  await db`INSERT INTO rf_sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})`;
  return token;
}

export async function userFromToken(token?: string) {
  if (!token) return null;
  if (!sql) {
    const local = localRead();
    const session = local.sessions.find(item => item.token === token && new Date(item.expiresAt) > new Date());
    return session ? local.users.find(user => user.id === session.userId) || null : null;
  }
  await ensureSchema();
  const rows = await database()`SELECT u.* FROM rf_sessions s JOIN rf_users u ON u.id = s.user_id WHERE s.token = ${token} AND s.expires_at > NOW()`;
  return rows.length ? fromRowUser(rows[0] as Row) : null;
}

export async function deleteSession(token?: string) {
  if (!token) return;
  if (!sql) { const local = localRead(); local.sessions = local.sessions.filter(session => session.token !== token); localSave(local); return; }
  await ensureSchema();
  await database()`DELETE FROM rf_sessions WHERE token = ${token}`;
}

function cleanAddress(data: Address): Address {
  const address = {
    street: data.street?.trim(), city: data.city?.trim(), postalCode: data.postalCode?.replace(/\D/g, ''), complement: data.complement?.trim(),
  };
  if (!address.street || !address.city || address.street.length > maxAddressFieldLength || address.city.length > maxAddressFieldLength || (address.complement?.length || 0) > maxAddressFieldLength || address.postalCode.length !== 8) throw new Error('Informe endereço, cidade e um CEP válido.');
  return address;
}

export async function updateUserProfile(userId: string, data: { name?: string; email?: string; address?: Address }) {
  if (!sql) {
    const local = localRead(); const user = local.users.find(item => item.id === userId);
    if (!user) throw new Error('Conta não encontrada.');
    if (data.name !== undefined) { const name = data.name.trim(); if (!nameIsValid(name)) throw new Error('Informe seu nome completo com até 120 caracteres.'); user.name = name; }
    if (data.email !== undefined) { const email = data.email.trim().toLowerCase(); if (!emailIsValid(email)) throw new Error('Informe um e-mail válido.'); if (local.users.some(item => item.id !== userId && item.email === email)) throw new Error('Este e-mail já está em uso.'); if (email !== user.email) user.emailVerified = false; user.email = email; }
    if (data.address !== undefined) user.address = cleanAddress(data.address);
    localSave(local); return publicUser(user);
  }
  await ensureSchema();
  const db = database();
  const rows = await db`SELECT * FROM rf_users WHERE id = ${userId}`;
  if (!rows.length) throw new Error('Conta não encontrada.');
  const user = fromRowUser(rows[0] as Row);
  const name = data.name === undefined ? user.name : data.name.trim();
  if (!nameIsValid(name)) throw new Error('Informe seu nome completo com até 120 caracteres.');
  const email = data.email === undefined ? user.email : data.email.trim().toLowerCase();
  if (!emailIsValid(email)) throw new Error('Informe um e-mail válido.');
  const conflict = await db`SELECT id FROM rf_users WHERE email = ${email} AND id <> ${userId}`;
  if (conflict.length) throw new Error('Este e-mail já está em uso.');
  const address = data.address === undefined ? user.address : cleanAddress(data.address);
  const verified = email === user.email ? Boolean(user.emailVerified) : false;
  const updated = await db`UPDATE rf_users SET name = ${name}, email = ${email}, address = ${address ? JSON.stringify(address) : null}::jsonb, email_verified = ${verified} WHERE id = ${userId} RETURNING *`;
  return publicUser(fromRowUser(updated[0] as Row));
}

export async function addProduct(product: Omit<StoredProduct, 'id'>) {
  const item: StoredProduct = { ...product, id: productId(), stock: Math.max(0, Math.floor(product.stock ?? 10)) };
  if (!sql) {
    const local = localRead();
    local.products.unshift(item);
    local.inventory[item.id] = { stock: item.stock! };
    local.variants[item.id] = buildVariants(item, item.stock ?? 0);
    localSave(local);
    return item;
  }
  await ensureSchema();
  const db = database();
  await db`INSERT INTO rf_products (id, name, price, category, color, img, images, sizes, description, tag, is_new, stock, deleted) VALUES (${item.id}, ${item.name}, ${item.price}, ${item.cat}, ${item.color}, ${item.img}, ${JSON.stringify(item.images || [item.img])}::jsonb, ${JSON.stringify(item.sizes || [])}::jsonb, ${item.desc}, ${item.tag || null}, ${Boolean(item.isNew)}, ${item.stock}, FALSE)`;
  await db`INSERT INTO rf_inventory (product_id, stock, deleted) VALUES (${item.id}, ${item.stock}, FALSE) ON CONFLICT (product_id) DO UPDATE SET stock = EXCLUDED.stock, deleted = FALSE, updated_at = NOW()`;
  await saveProductVariants(item.id, buildVariants(item, item.stock ?? 0));
  return item;
}

/**
 * Reaplica a grade da peça quando os tamanhos ou as cores mudam. O estoque das
 * combinações que continuam existindo é preservado; as novas nascem zeradas
 * para a dona da loja informar a quantidade real.
 */
async function syncVariantsWithProduct(id: string, product: { color: string; sizes?: string[] }) {
  const current = await variantsForProduct(id);
  if (!current.length) return;
  await saveProductVariants(id, reconcileVariants(product, current));
}

export async function updateProduct(id: string, changes: Partial<Omit<StoredProduct, 'id'>>) {
  if (!sql) {
    const local = localRead(); const index = local.products.findIndex(product => product.id === id);
    if (index >= 0) {
      local.products[index] = { ...local.products[index], ...changes };
      if (local.variants[id]?.length) local.variants[id] = reconcileVariants(local.products[index], local.variants[id]);
      localSave(local);
      return local.products[index];
    }
    local.overrides[id] = { ...(local.overrides[id] || {}), ...changes };
    const edited = local.overrides[id];
    if (edited.color && local.variants[id]?.length) local.variants[id] = reconcileVariants({ color: edited.color, sizes: edited.sizes }, local.variants[id]);
    localSave(local);
    return edited;
  }
  await ensureSchema();
  const db = database(); const rows = await db`SELECT * FROM rf_products WHERE id = ${id}`;
  if (rows.length) {
    const current = fromRowProduct(rows[0] as Row); const next = { ...current, ...changes };
    await db`UPDATE rf_products SET name = ${next.name}, price = ${next.price}, category = ${next.cat}, color = ${next.color}, img = ${next.img}, images = ${JSON.stringify(next.images || [next.img])}::jsonb, sizes = ${JSON.stringify(next.sizes || [])}::jsonb, description = ${next.desc}, tag = ${next.tag || null}, is_new = ${Boolean(next.isNew)}, stock = ${Math.max(0, Math.floor(next.stock ?? current.stock ?? 10))}, updated_at = NOW() WHERE id = ${id}`;
    await syncVariantsWithProduct(id, next);
    return next;
  }
  const current = await db`SELECT data FROM rf_product_overrides WHERE product_id = ${id}`;
  const next = { ...(current.length ? (asRecord((current[0] as Row).data) || {}) : {}), ...changes };
  await db`INSERT INTO rf_product_overrides (product_id, data, updated_at) VALUES (${id}, ${JSON.stringify(next)}::jsonb, NOW()) ON CONFLICT (product_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
  const edited = next as Partial<StoredProduct>;
  if (edited.color) await syncVariantsWithProduct(id, { color: edited.color, sizes: edited.sizes });
  return edited;
}

export async function setFeatured(ids: string[]) {
  const unique = [...new Set(ids.filter(id => typeof id === 'string'))].slice(0, 4);
  if (!sql) { const local = localRead(); local.featuredIds = unique; localSave(local); return; }
  await ensureSchema(); const db = database();
  await db`DELETE FROM rf_featured`;
  await Promise.all(unique.map((id, position) => db`INSERT INTO rf_featured (position, product_id) VALUES (${position}, ${id})`));
}

export async function promoteAdmin(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!emailIsValid(cleanEmail)) throw new Error('Informe um e-mail válido.');
  if (!sql) { const local = localRead(); const user = local.users.find(item => item.email === cleanEmail); if (!user) throw new Error('Não existe uma conta criada com este e-mail.'); user.role = 'ADMIN'; localSave(local); return publicUser(user); }
  await ensureSchema(); const rows = await database()`UPDATE rf_users SET role = 'ADMIN' WHERE email = ${cleanEmail} RETURNING *`;
  if (!rows.length) throw new Error('Não existe uma conta criada com este e-mail.'); return publicUser(fromRowUser(rows[0] as Row));
}

/**
 * Define o estoque total da peça repartindo o valor entre as variantes que ela
 * já oferece. Continua existindo para o ajuste rápido do painel; o controle
 * fino de cada tamanho e cor é feito por setVariantStock.
 */
export async function setStock(id: string, stock: number, product?: { color: string; sizes?: string[] }) {
  const quantity = Math.max(0, Math.floor(stock));
  const current = await variantsForProduct(id);
  const grade = current.length ? current : (product ? buildVariants(product, 0) : []);
  const shares = distributeStock(quantity, grade.length);
  const next = grade.map((variant, index) => ({ ...variant, stock: shares[index] ?? 0 }));
  if (next.length) {
    await saveProductVariants(id, next);
    return { stock: quantity };
  }

  if (!sql) { const local = localRead(); local.inventory[id] = { ...local.inventory[id], stock: quantity }; localSave(local); return local.inventory[id]; }
  await ensureSchema(); const db = database();
  await db`INSERT INTO rf_inventory (product_id, stock, deleted) VALUES (${id}, ${quantity}, FALSE) ON CONFLICT (product_id) DO UPDATE SET stock = EXCLUDED.stock, updated_at = NOW()`;
  await db`UPDATE rf_products SET stock = ${quantity}, updated_at = NOW() WHERE id = ${id}`;
  return { stock: quantity };
}

export async function deleteCatalogProduct(id: string) {
  if (!sql) { const local = localRead(); local.inventory[id] = { ...(local.inventory[id] || { stock: 0 }), deleted: true }; local.featuredIds = local.featuredIds.filter(item => item !== id); localSave(local); return; }
  await ensureSchema(); const db = database();
  await db`INSERT INTO rf_inventory (product_id, stock, deleted) VALUES (${id}, 0, TRUE) ON CONFLICT (product_id) DO UPDATE SET deleted = TRUE, updated_at = NOW()`;
  await db`UPDATE rf_products SET deleted = TRUE, updated_at = NOW() WHERE id = ${id}`;
  await db`DELETE FROM rf_featured WHERE product_id = ${id}`;
}

export async function createOrder(userId: string, order: Omit<Order, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const created: Order = { ...order, id: `rf-${randomBytes(8).toString('hex')}`, userId, status: 'PENDING', createdAt: now, updatedAt: now };
  if (!sql) { const local = localRead(); local.orders.unshift(created); localSave(local); return created; }
  await ensureSchema(); const db = database();
  await db.transaction([
    db`INSERT INTO rf_orders (id, user_id, status, total, discount, payment_method, payment_preference_id, payment_id, created_at, updated_at) VALUES (${created.id}, ${userId}, 'PENDING', ${created.total}, ${created.discount || 0}, ${created.paymentMethod || 'OTHER'}, ${created.paymentPreferenceId || null}, ${created.paymentId || null}, ${now}, ${now})`,
    ...created.items.map(item => db`INSERT INTO rf_order_items (order_id, product_id, name, size, color, quantity, unit_price) VALUES (${created.id}, ${item.id}, ${item.name}, ${item.size}, ${item.color || ''}, ${item.quantity}, ${item.unitPrice})`),
    ...(created.shipping ? [db`INSERT INTO rf_order_shipping (order_id, name, company, price, delivery_time) VALUES (${created.id}, ${created.shipping.name}, ${created.shipping.company}, ${created.shipping.price}, ${created.shipping.deliveryTime || null})`] : []),
  ]);
  return created;
}

export async function setOrderPreference(orderId: string, preferenceId: string) {
  if (!sql) { const local = localRead(); const order = local.orders.find(item => item.id === orderId); if (!order) return null; order.paymentPreferenceId = preferenceId; order.updatedAt = new Date().toISOString(); localSave(local); return order; }
  await ensureSchema(); const rows = await database()`UPDATE rf_orders SET payment_preference_id = ${preferenceId}, updated_at = NOW() WHERE id = ${orderId} RETURNING id`;
  if (!rows.length) return null; return (await databaseOrders()).find(order => order.id === orderId) || null;
}

export async function setOrderStatus(orderId: string, status: OrderStatus, paymentId?: string) {
  if (!sql) {
    const local = localRead(); const order = local.orders.find(item => item.id === orderId); if (!order) return null;
    if (order.status === 'APPROVED') return order;
    order.status = status; if (paymentId) order.paymentId = paymentId; order.updatedAt = new Date().toISOString();
    if (status === 'APPROVED') for (const item of order.items) {
      const grade = local.variants[item.id] || [];
      const size = normalizeSize(item.size);
      const color = normalizeColor(item.color || '');
      local.variants[item.id] = grade.map(variant => variant.size === size && variant.color === color ? { ...variant, stock: Math.max(0, variant.stock - item.quantity) } : variant);
      const total = totalStock(local.variants[item.id]);
      local.inventory[item.id] = { ...local.inventory[item.id], stock: total };
      const index = local.products.findIndex(product => product.id === item.id);
      if (index >= 0) local.products[index] = { ...local.products[index], stock: total };
    }
    localSave(local); return order;
  }
  await ensureSchema(); const db = database();
  const updated = await db`UPDATE rf_orders SET status = ${status}, payment_id = COALESCE(${paymentId || null}, payment_id), updated_at = NOW() WHERE id = ${orderId} AND status <> 'APPROVED' RETURNING id`;
  if (updated.length && status === 'APPROVED') {
    // A baixa é por tamanho e cor: descontar apenas por peça deixava um
    // tamanho esgotado à venda enquanto outro ainda tivesse estoque.
    const items = await db`SELECT product_id, size, color, SUM(quantity)::int AS quantity FROM rf_order_items WHERE order_id = ${orderId} GROUP BY product_id, size, color`;
    const touched = new Set<string>();
    for (const item of items as Row[]) {
      const productId = readString(item.product_id);
      const size = normalizeSize(readString(item.size));
      const color = normalizeColor(readString(item.color));
      const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 1)));
      await db`UPDATE rf_variants SET stock = GREATEST(0, stock - ${quantity}), updated_at = NOW() WHERE product_id = ${productId} AND size = ${size} AND color = ${color}`;
      touched.add(productId);
    }
    for (const productId of touched) await syncProductStock(productId);
  }
  return (await databaseOrders()).find(order => order.id === orderId) || null;
}

export async function ordersForUser(userId: string) {
  if (!sql) return localRead().orders.filter(order => order.userId === userId);
  return databaseOrders(userId);
}

export async function listOrdersWithCustomers(): Promise<AdminOrder[]> {
  const orders = await (sql ? databaseOrders() : Promise.resolve(localRead().orders));
  if (!orders.length) return [];
  if (!sql) {
    const users = new Map(localRead().users.map(user => [user.id, publicUser(user)]));
    return orders.map(order => ({ ...order, customer: users.get(order.userId) || null }));
  }
  await ensureSchema(); const rows = await database()`SELECT * FROM rf_users`;
  const users = new Map((rows as Row[]).map(row => { const user = publicUser(fromRowUser(row)); return [user.id, user]; }));
  return orders.map(order => ({ ...order, customer: users.get(order.userId) || null }));
}

export async function userForOrder(order: Order) {
  if (!sql) { const user = localRead().users.find(item => item.id === order.userId); return user ? publicUser(user) : null; }
  await ensureSchema(); const rows = await database()`SELECT * FROM rf_users WHERE id = ${order.userId}`;
  return rows.length ? publicUser(fromRowUser(rows[0] as Row)) : null;
}

export async function subscribe(email: string) {
  const cleanEmail = email.trim().toLowerCase(); if (!emailIsValid(cleanEmail)) throw new Error('Informe um e-mail válido.');
  if (!sql) { const local = localRead(); if (!local.subscribers.some(item => item.email === cleanEmail)) { local.subscribers.push({ email: cleanEmail, createdAt: new Date().toISOString() }); localSave(local); } return; }
  await ensureSchema(); await database()`INSERT INTO rf_subscribers (email) VALUES (${cleanEmail}) ON CONFLICT (email) DO NOTHING`;
}

export async function createContactMessage(data: { name: string; email: string; subject: string; message: string }) {
  const name = data.name.trim(), email = data.email.trim().toLowerCase(), subject = data.subject.trim(), message = data.message.trim();
  if (!nameIsValid(name) || !emailIsValid(email) || subject.length < 3 || subject.length > 180 || message.length < 5 || message.length > 8_000) throw new Error('Preencha todos os campos com informações válidas.');
  const item = { id: randomBytes(8).toString('hex'), name, email, subject, message, createdAt: new Date().toISOString() };
  if (!sql) { const local = localRead(); local.messages.unshift(item); localSave(local); return; }
  await ensureSchema(); await database()`INSERT INTO rf_messages (id, name, email, subject, message, created_at) VALUES (${item.id}, ${name}, ${email}, ${subject}, ${message}, ${item.createdAt})`;
}

export async function issueEmailVerification(userId: string) {
  const token = randomBytes(32).toString('hex'); const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  if (!sql) {
    const local = localRead(); const user = local.users.find(item => item.id === userId); if (!user) throw new Error('Conta não encontrada.');
    local.emailVerificationTokens = local.emailVerificationTokens.filter(item => item.userId !== userId && new Date(item.expiresAt) > new Date());
    local.emailVerificationTokens.push({ tokenHash: hashToken(token), userId, expiresAt }); localSave(local); return { token, email: user.email, name: user.name };
  }
  await ensureSchema(); const db = database(); const rows = await db`SELECT * FROM rf_users WHERE id = ${userId}`;
  if (!rows.length) throw new Error('Conta não encontrada.');
  await db`DELETE FROM rf_email_verification_tokens WHERE user_id = ${userId} OR expires_at <= NOW()`;
  await db`INSERT INTO rf_email_verification_tokens (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${userId}, ${expiresAt})`;
  const user = fromRowUser(rows[0] as Row); return { token, email: user.email, name: user.name };
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  if (!sql) {
    const local = localRead(); const match = local.emailVerificationTokens.find(item => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
    if (!match) throw new Error('Este link de confirmação expirou ou é inválido.'); const user = local.users.find(item => item.id === match.userId); if (!user) throw new Error('Conta não encontrada.');
    user.emailVerified = true; local.emailVerificationTokens = local.emailVerificationTokens.filter(item => item.tokenHash !== tokenHash); localSave(local); return publicUser(user);
  }
  await ensureSchema(); const db = database(); const rows = await db`SELECT user_id FROM rf_email_verification_tokens WHERE token_hash = ${tokenHash} AND expires_at > NOW()`;
  if (!rows.length) throw new Error('Este link de confirmação expirou ou é inválido.'); const userId = readString((rows[0] as Row).user_id);
  const users = await db`UPDATE rf_users SET email_verified = TRUE WHERE id = ${userId} RETURNING *`;
  await db`DELETE FROM rf_email_verification_tokens WHERE token_hash = ${tokenHash}`;
  if (!users.length) throw new Error('Conta não encontrada.'); return publicUser(fromRowUser(users[0] as Row));
}

export async function issuePasswordReset(email: string) {
  const cleanEmail = email.trim().toLowerCase(); const token = randomBytes(32).toString('hex'); const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  if (!sql) {
    const local = localRead(); const user = local.users.find(item => item.email === cleanEmail); if (!user) return null;
    local.passwordResetTokens = local.passwordResetTokens.filter(item => item.userId !== user.id && new Date(item.expiresAt) > new Date());
    local.passwordResetTokens.push({ tokenHash: hashToken(token), userId: user.id, expiresAt }); localSave(local); return { token, email: user.email, name: user.name };
  }
  await ensureSchema(); const db = database(); const rows = await db`SELECT * FROM rf_users WHERE email = ${cleanEmail}`;
  if (!rows.length) return null; const user = fromRowUser(rows[0] as Row);
  await db`DELETE FROM rf_password_reset_tokens WHERE user_id = ${user.id} OR expires_at <= NOW()`;
  await db`INSERT INTO rf_password_reset_tokens (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${user.id}, ${expiresAt})`;
  return { token, email: user.email, name: user.name };
}

export async function resetPassword(token: string, password: string) {
  if (!passwordIsStrong(password)) throw new Error('A senha deve ter 10 caracteres, com maiúscula, minúscula, número e símbolo.');
  const tokenHash = hashToken(token); const salt = randomBytes(16).toString('hex'); const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  if (!sql) {
    const local = localRead(); const match = local.passwordResetTokens.find(item => item.tokenHash === tokenHash && new Date(item.expiresAt) > new Date());
    if (!match) throw new Error('Este link de recuperação expirou ou é inválido.'); const user = local.users.find(item => item.id === match.userId); if (!user) throw new Error('Conta não encontrada.');
    user.passwordHash = passwordHash; local.passwordResetTokens = local.passwordResetTokens.filter(item => item.tokenHash !== tokenHash); local.sessions = local.sessions.filter(session => session.userId !== user.id); localSave(local); return;
  }
  await ensureSchema(); const db = database(); const rows = await db`SELECT user_id FROM rf_password_reset_tokens WHERE token_hash = ${tokenHash} AND expires_at > NOW()`;
  if (!rows.length) throw new Error('Este link de recuperação expirou ou é inválido.'); const userId = readString((rows[0] as Row).user_id);
  await db.transaction([
    db`UPDATE rf_users SET password_hash = ${passwordHash} WHERE id = ${userId}`,
    db`DELETE FROM rf_password_reset_tokens WHERE token_hash = ${tokenHash}`,
    db`DELETE FROM rf_sessions WHERE user_id = ${userId}`,
  ]);
}

export async function favoritesForUser(userId: string) {
  if (!sql) return localRead().favorites[userId] || [];
  await ensureSchema(); const rows = await database()`SELECT product_id FROM rf_favorites WHERE user_id = ${userId} ORDER BY created_at DESC`;
  return (rows as Row[]).map(row => readString(row.product_id));
}

export async function setFavoritesForUser(userId: string, productIds: string[]) {
  const ids = [...new Set(productIds.filter(id => typeof id === 'string' && id.length > 0 && id.length <= 128))].slice(0, 200);
  if (!sql) { const local = localRead(); local.favorites[userId] = ids; localSave(local); return ids; }
  await ensureSchema(); const db = database();
  await db.transaction([db`DELETE FROM rf_favorites WHERE user_id = ${userId}`, ...ids.map(id => db`INSERT INTO rf_favorites (user_id, product_id) VALUES (${userId}, ${id})`)]);
  return ids;
}
