import { NextRequest, NextResponse } from "next/server";
import { appendItem, appendItems, getAllItems, saveAllItems } from "@/app/lib/galleryStore";
import { s3, S3_BUCKET, S3_PUBLIC_BASEURL } from "@/app/lib/s3";
import { DeleteObjectCommand, ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import type { GalleryItem } from "@/app/types/gallery";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const limit = parseInt(searchParams.get("limit") || "12", 10);
  const cursor = searchParams.get("cursor"); // cursor is an index offset string

  // Load current metadata
  let all = await getAllItems();

  // Discover any objects directly added to S3 via migration and merge them
  try {
    const existingKeys = new Set((all || []).map(i => i.key).filter(Boolean) as string[]);
    const prefix = "gallery/assets/";
    let continuationToken: string | undefined = undefined;
    const discovered: GalleryItem[] = [];
    const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com`;

    // Paginate through bucket listing
    // Note: Keep this lightweight; structure your migration under the prefix to avoid scanning entire bucket
    do {
      const out: ListObjectsV2CommandOutput = await s3.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: prefix, ContinuationToken: continuationToken }));
      const contents = out.Contents || [];
      for (const obj of contents) {
        const key = obj.Key as string;
        if (!key || key.endsWith("/")) continue;
        if (existingKeys.has(key)) continue;
        // Key formats supported:
        // - gallery/assets/{type}/{category}/{filename}
        // - gallery/assets/{category}/{filename}
        const parts = key.split("/");
        const typePart = parts[2] || "";
        let categoryPart = parts[3] || undefined;
        let filename = parts[4] || "";
        if (typePart !== "image" && typePart !== "video") {
          // Treat parts[2] as category and shift filename accordingly
          categoryPart = parts[2] || undefined;
          filename = parts[3] || "";
        }
        const ext = (filename.split(".").pop() || "").toLowerCase();
        const typeGuess = typePart === "video" || ["mp4","mov","webm","mkv","m4v"].includes(ext)
          ? "video" : "image";
        const createdAt = (obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date().toISOString());
        const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;
        const item: GalleryItem = {
          id: key, // stable id based on S3 key
          type: typeGuess as GalleryItem["type"],
          url: publicUrl,
          key,
          category: categoryPart,
          categoryLabel: categoryPart,
          createdAt,
        };
        discovered.push(item);
      }
      continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (continuationToken);

    if (discovered.length) {
      // Merge and sort newest-first by createdAt
      all = [...discovered, ...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      await saveAllItems(all);
    }
  } catch (_) {
    // Ignore listing failures and continue with existing metadata
  }

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
