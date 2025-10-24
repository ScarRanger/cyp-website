import { NextRequest, NextResponse } from "next/server";
import { appendItem, getAllItems } from "@/app/lib/galleryStore";
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
    const body = (await req.json()) as GalleryItem;
    if (!body || !body.id || !body.type || !body.url) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    await appendItem({ ...body, createdAt: body.createdAt || new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
