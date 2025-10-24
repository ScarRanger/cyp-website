import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/app/lib/s3";
import type { GalleryItem } from "@/app/types/gallery";

const METADATA_KEY = "gallery/metadata.json";

interface MetadataFile {
  items: GalleryItem[];
  updatedAt: string;
}

async function bodyToUint8Array(body: any): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  // Browser/Web ReadableStream
  if (typeof body.getReader === 'function') {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged;
  }
  // Node.js stream.Readable
  if (typeof body.on === 'function') {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      body.on('data', (c: Buffer) => chunks.push(c));
      body.on('end', () => resolve());
      body.on('error', reject);
    });
    const buf = Buffer.concat(chunks);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  // Some environments expose transformToByteArray
  if (typeof body.transformToByteArray === 'function') {
    const arr: Uint8Array = await body.transformToByteArray();
    return arr;
  }
  // Already a Uint8Array or Buffer
  if (body instanceof Uint8Array) return body;
  if (Buffer.isBuffer(body)) return new Uint8Array(body.buffer, body.byteOffset, body.length);
  return new Uint8Array();
}

export async function getAllItems(): Promise<GalleryItem[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: METADATA_KEY })
    );
    const buf = await bodyToUint8Array((res as any).Body);
    const text = new TextDecoder().decode(buf);
    const parsed: MetadataFile = JSON.parse(text);
    return parsed.items || [];
  } catch (e: any) {
    // If not found, return empty
    return [];
  }
}

export async function saveAllItems(items: GalleryItem[]): Promise<void> {
  const payload: MetadataFile = { items, updatedAt: new Date().toISOString() };
  const Body = Buffer.from(JSON.stringify(payload, null, 2));
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: METADATA_KEY,
      Body,
      ContentType: "application/json",
    })
  );
}

export async function appendItem(item: GalleryItem): Promise<void> {
  const items = await getAllItems();
  items.unshift(item);
  await saveAllItems(items);
}

export async function appendItems(newItems: GalleryItem[]): Promise<void> {
  if (!newItems.length) return;
  const items = await getAllItems();
  // Prepend all new items preserving their order (assume caller ordered newest-first)
  const combined = [...newItems, ...items];
  await saveAllItems(combined);
}
