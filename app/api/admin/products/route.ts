import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { findCatalogProduct } from '../../../../lib/catalog';
import { addProduct, setStock, updateProduct } from '../../../../lib/store';

const maxImageBytes = 12 * 1024 * 1024;
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

async function saveUploads(form: FormData) {
  const files = [...form.getAll('images'), form.get('image')]
    .filter((item): item is File => item instanceof File && item.size > 0 && Boolean(item.name));
  const selected = [...form.getAll('galleryImages'), form.get('galleryImage')]
    .filter((item): item is string => typeof item === 'string' && item.startsWith('/uploads/'));
  const uploaded: string[] = [];
  if (files.length + selected.length > 8) throw new Error('Use no máximo 8 fotos por peça.');

  for (const file of files) {
    if (!extensions[file.type]) throw new Error('Envie arquivos de imagem em JPG, PNG ou WEBP.');
    if (file.size > maxImageBytes) throw new Error('Cada imagem deve ter no máximo 12 MB.');
    const ext = extensions[file.type];
    const name = `${randomBytes(10).toString('hex')}.${ext}`;
    const directory = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), Buffer.from(await file.arrayBuffer()));
    uploaded.push(`/uploads/${name}`);
  }

  return [...new Set([...selected, ...uploaded])];
}

function productValues(form: FormData, images: string[]) {
  const price = Number(form.get('price'));
  const stock = Number(form.get('stock'));
  const sizes = String(form.get('sizes') || '').split(',').map(size => size.trim().toUpperCase()).filter(Boolean);
  const product = {
    name: String(form.get('name') || '').trim(),
    price,
    cat: String(form.get('cat') || '').trim(),
    color: String(form.get('color') || '').trim(),
    desc: String(form.get('desc') || '').trim(),
    isNew: form.get('isNew') === 'true',
    images,
    img: images[0] || '',
    sizes: [...new Set(sizes)],
    stock,
  };
  if (!product.name || !Number.isFinite(price) || price <= 0 || !product.cat || !product.color || !product.desc || !product.img || !Number.isFinite(stock) || stock < 0) throw new Error('Preencha os dados, informe um preço e estoque válidos e escolha ao menos uma foto.');
  return { ...product, stock: Math.floor(stock) };
}

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: message === 'Não autorizado' ? 403 : 400 });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const product = productValues(form, await saveUploads(form));
    return NextResponse.json({ product: addProduct(product) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Não foi possível publicar a peça.');
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const id = String(form.get('id') || '');
    const current = findCatalogProduct(id);
    if (!current) throw new Error('Produto não encontrado.');
    let existing: unknown = [];
    try { existing = JSON.parse(String(form.get('existingImages') || '[]')); } catch { throw new Error('As fotos da peça não puderam ser lidas.'); }
    const persistedImages = Array.isArray(existing) ? existing.filter((image): image is string => typeof image === 'string' && image.length > 0) : [];
    const values = productValues(form, [...new Set([...persistedImages, ...(await saveUploads(form))])]);
    updateProduct(id, values);
    setStock(id, values.stock);
    return NextResponse.json({ product: findCatalogProduct(id) });
  } catch (error) {
    return errorResponse(error, 'Não foi possível atualizar a peça.');
  }
}
