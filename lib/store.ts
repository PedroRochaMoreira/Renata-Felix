import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export type StoredProduct = { id: string; name: string; price: number; cat: string; color: string; img: string; images?: string[]; sizes?: string[]; desc: string; tag?: string; isNew?: boolean; stock?: number };
export type Address = { street: string; city: string; postalCode: string; complement?: string };
export type PublicUser = { id: string; name: string; email: string; role: 'ADMIN' | 'CUSTOMER'; createdAt: string; address?: Address };
export type Order = { id: string; userId: string; status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; items: { id: string; name: string; size: string; quantity: number; unitPrice: number }[]; shipping?: { name: string; company: string; price: number; deliveryTime?: number }; total: number; paymentPreferenceId?: string; paymentId?: string; createdAt: string; updatedAt: string };
type User = PublicUser & { passwordHash: string };
type Session = { token: string; userId: string; expiresAt: string };
type Db = { users: User[]; sessions: Session[]; products: StoredProduct[]; featuredIds: string[]; inventory: Record<string, { stock: number; deleted?: boolean }>; overrides: Record<string, Partial<StoredProduct>>; orders: Order[]; subscribers: { email: string; createdAt: string }[]; messages: { id: string; name: string; email: string; subject: string; message: string; createdAt: string }[] };

const file = path.join(process.cwd(), 'data', 'renata-felix.json');
const empty = (): Db => ({ users: [], sessions: [], products: [], featuredIds: [], inventory: {}, overrides: {}, orders: [], subscribers: [], messages: [] });

function read(): Db {
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(empty(), null, 2));
    return empty();
  }
  const db = JSON.parse(readFileSync(file, 'utf8')) as Partial<Db>;
  return { users: db.users || [], sessions: db.sessions || [], products: db.products || [], featuredIds: db.featuredIds || [], inventory: db.inventory || {}, overrides: db.overrides || {}, orders: db.orders || [], subscribers: db.subscribers || [], messages: db.messages || [] };
}

function save(db: Db) { writeFileSync(file, JSON.stringify(db, null, 2)); }
function emailIsValid(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email); }
export function publicUser(user: User): PublicUser { const { passwordHash: _passwordHash, ...safe } = user; return safe; }

export function listProducts() { return read().products; }
export function featured() { return read().featuredIds; }
export function inventory() { return read().inventory; }
export function overrides() { return read().overrides; }

export function createUser(name: string, email: string, password: string) {
  const db = read();
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2) throw new Error('Informe seu nome completo.');
  if (!emailIsValid(cleanEmail)) throw new Error('Informe um e-mail válido.');
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(password)) throw new Error('A senha deve ter 10 caracteres, com maiúscula, minúscula, número e símbolo.');
  if (db.users.some(user => user.email === cleanEmail)) throw new Error('Já existe uma conta com este e-mail.');
  const salt = randomBytes(16).toString('hex');
  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const role = ownerEmail ? (cleanEmail === ownerEmail ? 'ADMIN' : 'CUSTOMER') : (db.users.length === 0 ? 'ADMIN' : 'CUSTOMER');
  const user: User = { id: randomBytes(12).toString('hex'), name: cleanName, email: cleanEmail, passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, role, createdAt: new Date().toISOString() };
  db.users.push(user);
  save(db);
  return user;
}

export function validateUser(email: string, password: string) {
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const user = read().users.find(item => item.email === email.trim().toLowerCase());
  if (!user) return null;
  const [salt, hash] = user.passwordHash.split(':');
  if (!salt || !hash) return null;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), candidate) ? user : null;
}

export function makeSession(userId: string) {
  const db = read();
  const token = randomBytes(32).toString('hex');
  db.sessions = db.sessions.filter(session => new Date(session.expiresAt) > new Date());
  db.sessions.push({ token, userId, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() });
  save(db);
  return token;
}

export function userFromToken(token?: string) {
  if (!token) return null;
  const db = read();
  const session = db.sessions.find(item => item.token === token && new Date(item.expiresAt) > new Date());
  return session ? db.users.find(user => user.id === session.userId) || null : null;
}

export function deleteSession(token?: string) {
  if (!token) return;
  const db = read();
  db.sessions = db.sessions.filter(session => session.token !== token);
  save(db);
}

export function updateUserProfile(userId: string, data: { name?: string; email?: string; address?: Address }) {
  const db = read();
  const user = db.users.find(item => item.id === userId);
  if (!user) throw new Error('Conta não encontrada.');
  if (data.name !== undefined) {
    const name = data.name.trim();
    if (name.length < 2) throw new Error('Informe seu nome completo.');
    user.name = name;
  }
  if (data.email !== undefined) {
    const email = data.email.trim().toLowerCase();
    if (!emailIsValid(email)) throw new Error('Informe um e-mail válido.');
    if (db.users.some(item => item.id !== userId && item.email === email)) throw new Error('Este e-mail já está em uso.');
    user.email = email;
  }
  if (data.address !== undefined) {
    const address = { ...data.address, street: data.address.street?.trim(), city: data.address.city?.trim(), postalCode: data.address.postalCode?.replace(/\D/g, ''), complement: data.address.complement?.trim() };
    if (!address.street || !address.city || address.postalCode.length !== 8) throw new Error('Informe endereço, cidade e um CEP válido.');
    user.address = address;
  }
  save(db);
  return publicUser(user);
}

export function addProduct(product: Omit<StoredProduct, 'id'>) {
  const db = read();
  const item = { ...product, id: `custom-${randomBytes(8).toString('hex')}` };
  db.products.unshift(item);
  db.inventory[item.id] = { stock: Number(item.stock ?? 10) };
  save(db);
  return item;
}

export function updateProduct(id: string, changes: Partial<Omit<StoredProduct, 'id'>>) {
  const db = read();
  const index = db.products.findIndex(product => product.id === id);
  if (index >= 0) { db.products[index] = { ...db.products[index], ...changes }; save(db); return db.products[index]; }
  db.overrides[id] = { ...(db.overrides[id] || {}), ...changes };
  save(db);
  return db.overrides[id];
}

export function setFeatured(ids: string[]) {
  const db = read();
  db.featuredIds = [...new Set(ids.filter(id => typeof id === 'string'))].slice(0, 4);
  save(db);
}

export function promoteAdmin(email: string) {
  const db = read();
  const user = db.users.find(item => item.email === email.trim().toLowerCase());
  if (!user) throw new Error('Não existe uma conta criada com este e-mail.');
  user.role = 'ADMIN';
  save(db);
  return publicUser(user);
}

export function setStock(id: string, stock: number) {
  const db = read();
  db.inventory[id] = { ...db.inventory[id], stock: Math.max(0, Math.floor(stock)) };
  save(db);
  return db.inventory[id];
}

export function deleteCatalogProduct(id: string) {
  const db = read();
  db.inventory[id] = { ...(db.inventory[id] || { stock: 0 }), deleted: true };
  db.featuredIds = db.featuredIds.filter(item => item !== id);
  save(db);
}

export function createOrder(userId: string, order: Omit<Order, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>) {
  const db = read();
  const now = new Date().toISOString();
  const created: Order = { ...order, id: `rf-${randomBytes(8).toString('hex')}`, userId, status: 'PENDING', createdAt: now, updatedAt: now };
  db.orders.unshift(created);
  save(db);
  return created;
}

export function setOrderPreference(orderId: string, preferenceId: string) {
  const db = read();
  const order = db.orders.find(item => item.id === orderId);
  if (!order) return null;
  order.paymentPreferenceId = preferenceId;
  order.updatedAt = new Date().toISOString();
  save(db);
  return order;
}

export function setOrderStatus(orderId: string, status: Order['status'], paymentId?: string) {
  const db = read();
  const order = db.orders.find(item => item.id === orderId);
  if (!order) return null;
  if (order.status === 'APPROVED') return order;
  order.status = status;
  if (paymentId) order.paymentId = paymentId;
  order.updatedAt = new Date().toISOString();
  if (status === 'APPROVED') {
    for (const item of order.items) {
      const current = db.inventory[item.id] || { stock: 10 };
      db.inventory[item.id] = { ...current, stock: Math.max(0, current.stock - item.quantity) };
    }
  }
  save(db);
  return order;
}

export function ordersForUser(userId: string) { return read().orders.filter(order => order.userId === userId); }

export function subscribe(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!emailIsValid(cleanEmail)) throw new Error('Informe um e-mail válido.');
  const db = read();
  if (!db.subscribers.some(item => item.email === cleanEmail)) { db.subscribers.push({ email: cleanEmail, createdAt: new Date().toISOString() }); save(db); }
}

export function createContactMessage(data: { name: string; email: string; subject: string; message: string }) {
  const name = data.name.trim(), email = data.email.trim().toLowerCase(), subject = data.subject.trim(), message = data.message.trim();
  if (name.length < 2 || !emailIsValid(email) || subject.length < 3 || message.length < 5) throw new Error('Preencha todos os campos com informações válidas.');
  const db = read();
  db.messages.unshift({ id: randomBytes(8).toString('hex'), name, email, subject, message, createdAt: new Date().toISOString() });
  save(db);
}
