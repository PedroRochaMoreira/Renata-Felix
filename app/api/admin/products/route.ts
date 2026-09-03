import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { catalogImages, findCatalogProduct, productImages } from '../../../../lib/catalog';
import { addProduct, setStock, updateProduct } from '../../../../lib/store';
import { removeUnusedImages, uploadProductImage } from '../../../../lib/uploads';

const maxImages = 8;

async function saveUploads(form: FormData) {
  const files = [...form.getAll('images'), form.get('image')].filter(
    (item): item is File => item instanceof File && item.size > 0 && Boolean(item.name),
  );
  const selected = [...form.getAll('galleryImages'), form.get('galleryImage')].filter(
    (item): item is string => typeof item === 'string' && (item.startsWith('/uploads/') || item.startsWith('https://')),
  );
  if (files.length + selected.length > maxImages) throw new Error(`Use no máximo ${maxImages} fotos por peça.`);
  const uploaded = await Promise.all(files.map(uploadProductImage));
  const images = [...new Set([...selected, ...uploaded])];
  if (images.length > maxImages) throw new Error(`Use no máximo ${maxImages} fotos por peça.`);
  return images;
}

function productValues(form: FormData, images: string[]) {
  const price = Number(form.get('price'));
  const stock = Number(form.get('stock'));
  const sizes = String(form.get('sizes') || '')
    .split(',')
    .map(size => size.trim().toUpperCase())
    .filter(Boolean);
  const uniqueImages = [...new Set(images)];
  const product = {
    name: String(form.get('name') || '').trim(),
    price,
    cat: String(form.get('cat') || '').trim(),
    color: String(form.get('color') || '').trim(),
    desc: String(form.get('desc') || '').trim(),
    isNew: form.get('isNew') === 'true',
    images: uniqueImages,
    img: uniqueImages[0] || '',
    sizes: [...new Set(sizes)],
    stock,
  };
  if (
    !product.name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !product.cat ||
    !product.color ||
    !product.desc ||
    !product.img ||
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    throw new Error('Preencha os dados, informe um preço e estoque válidos e escolha ao menos uma foto.');
  }
  if (
    product.name.length > 120 ||
    product.cat.length > 60 ||
    product.color.length > 60 ||
    product.desc.length > 3_000 ||
    product.sizes.some(size => size.length > 20) ||
    price > 10_000_000 ||
    stock > 100_000
  ) {
    throw new Error('Revise os dados da peça: os campos informados excedem o limite permitido.');
  }
  if (uniqueImages.length > maxImages) throw new Error(`Use no máximo ${maxImages} fotos por peça.`);
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
    return NextResponse.json({ product: await addProduct(product) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Não foi possível publicar a peça.');
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const id = String(form.get('id') || '');
    const current = await findCatalogProduct(id);
    if (!current) throw new Error('Produto não encontrado.');
    let existing: unknown = [];
    try {
      existing = JSON.parse(String(form.get('existingImages') || '[]'));
    } catch {
      throw new Error('As fotos da peça não puderam ser lidas.');
    }
    const persistedImages = Array.isArray(existing)
      ? existing.filter((image): image is string => typeof image === 'string' && image.length > 0)
      : [];
    const values = productValues(form, [...new Set([...persistedImages, ...(await saveUploads(form))])]);
    const previousImages = productImages(current);
    await updateProduct(id, values);
    await setStock(id, values.stock);

    // As fotos retiradas da peça só saem do armazenamento se nenhuma outra
    // peça continuar usando a mesma imagem. Uma falha aqui não desfaz a edição.
    try {
      await removeUnusedImages(previousImages, await catalogImages());
    } catch {
      console.error(`Não foi possível limpar as fotos antigas da peça ${id}.`);
    }
    return NextResponse.json({ product: await findCatalogProduct(id) });
  } catch (error) {
    return errorResponse(error, 'Não foi possível atualizar a peça.');
  }
}
