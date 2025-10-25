import { NextRequest, NextResponse } from "next/server";
import { appendItem, appendItems, getAllItems, saveAllItems } from "@/app/lib/galleryStore";
import { s3, S3_BUCKET } from "@/app/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { GalleryItem } from "@/app/types/gallery";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const cursor = searchParams.get("cursor"); // cursor is an index offset string

  const all = await getAllItems();
  const filtered = category && category !== "all" ? all.filter(i => i.category === category) : all;

  const start = cursor ? parseInt(cursor, 10) : 0;
  const slice = filtered.slice(start, start + limit);
  const nextCursor = start + slice.length < filtered.length ? String(start + slice.length) : undefined;

  return NextResponse.json({ items: slice, nextCursor });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string | undefined;

    if (action === 'bulk') {
      const items = body?.items as GalleryItem[] | undefined;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "No items provided" }, { status: 400 });
      }
      for (const it of items) {
        if (!it.id || !it.type || !it.url) {
          return NextResponse.json({ error: "Invalid item in payload" }, { status: 400 });
        }
        it.createdAt = it.createdAt || new Date().toISOString();
      }
      await appendItems(items);
      return NextResponse.json({ ok: true, count: items.length });
    }

    if (action === 'delete') {
      const ids = Array.isArray(body?.ids) ? (body.ids as string[]).filter(Boolean) : [];
      if (!ids.length) return NextResponse.json({ error: "No ids provided" }, { status: 400 });

      const items = await getAllItems();
      const toRemove = items.filter(i => ids.includes(i.id));

      await Promise.all(
        toRemove
          .filter(i => i.key)
          .map(i => s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: i.key as string })))
      );

      const remaining = items.filter(i => !ids.includes(i.id));
      await saveAllItems(remaining);

      return NextResponse.json({ ok: true, deleted: toRemove.length, remaining: remaining.length });
    }

    const item = body as GalleryItem;
    if (!item || !item.id || !item.type || !item.url) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await appendItem({ ...item, createdAt: item.createdAt || new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
