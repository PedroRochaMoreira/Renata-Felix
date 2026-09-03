import { del, list, put } from '@vercel/blob';
import { randomBytes } from 'crypto';
import { mkdir, readdir, unlink, writeFile } from 'fs/promises';
import path from 'path';

const maxImageBytes = 12 * 1024 * 1024;
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export type ImageStorageStatus = 'blob' | 'local' | 'missing';

export function imageStorageStatus(): ImageStorageStatus {
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  return process.env.VERCEL ? 'missing' : 'local';
}

function assertImage(file: File) {
  if (!extensions[file.type]) throw new Error('Envie arquivos de imagem em JPG, PNG ou WEBP.');
  if (file.size > maxImageBytes) throw new Error('Cada imagem deve ter no máximo 12 MB.');
}

export async function uploadProductImage(file: File) {
  assertImage(file);
  const name = `products/${new Date().getFullYear()}/${randomBytes(12).toString('hex')}.${extensions[file.type]}`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await put(name, Buffer.from(await file.arrayBuffer()), { access: 'public', contentType: file.type, addRandomSuffix: false });
    return result.url;
  }
  if (process.env.VERCEL) throw new Error('O armazenamento de fotos ainda não está configurado. Crie um Vercel Blob e adicione BLOB_READ_WRITE_TOKEN nas variáveis do projeto.');
  const directory = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(directory, { recursive: true });
  const localName = name.split('/').pop()!;
  await writeFile(path.join(directory, localName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${localName}`;
}

export async function listProductImages() {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const result = await list({ prefix: 'products/', limit: 1000 });
    return result.blobs.map(blob => blob.url).sort().reverse();
  }
  if (process.env.VERCEL) return [];
  const directory = path.join(process.cwd(), 'public', 'uploads');
  try { return (await readdir(directory)).filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file)).map(file => `/uploads/${file}`); } catch { return []; }
}

export async function removeProductImage(url: string) {
  if (process.env.BLOB_READ_WRITE_TOKEN && url.includes('.blob.vercel-storage.com/')) { await del(url); return; }
  if (!process.env.VERCEL && url.startsWith('/uploads/')) {
    try { await unlink(path.join(process.cwd(), 'public', 'uploads', path.basename(url))); } catch { /* image may be shared or already absent */ }
  }
}

/**
 * Apaga apenas as fotos que nenhuma outra peça do catálogo ainda usa. A
 * galeria permite reaproveitar a mesma foto em várias peças, por isso a
 * exclusão nunca pode ser feita apenas pelo produto removido.
 */
export async function removeUnusedImages(candidates: string[], stillUsed: Set<string>) {
  const orphans = [...new Set(candidates)].filter(image => image && !stillUsed.has(image));
  for (const image of orphans) {
    try {
      await removeProductImage(image);
    } catch {
      console.error(`Não foi possível remover a foto ${image} do armazenamento.`);
    }
  }
  return orphans;
}
