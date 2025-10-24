import { NextRequest, NextResponse } from "next/server";
import { appendItems } from "@/app/lib/galleryStore";
import type { GalleryItem } from "@/app/types/gallery";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { items: GalleryItem[] };
    if (!body?.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    // Basic validation
    for (const it of body.items) {
      if (!it.id || !it.type || !it.url) {
        return NextResponse.json({ error: "Invalid item in payload" }, { status: 400 });
      }
      it.createdAt = it.createdAt || new Date().toISOString();
    }
    await appendItems(body.items);
    return NextResponse.json({ ok: true, count: body.items.length });
  } catch (e) {
    return NextResponse.json({ error: "Failed to save items" }, { status: 500 });
  }
}
