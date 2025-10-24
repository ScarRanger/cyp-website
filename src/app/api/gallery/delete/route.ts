import { NextRequest, NextResponse } from "next/server";
import { getAllItems, saveAllItems } from "@/app/lib/galleryStore";
import { s3, S3_BUCKET } from "@/app/lib/s3";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { ids: string[] };
    const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    if (!ids.length) return NextResponse.json({ error: "No ids provided" }, { status: 400 });

    const items = await getAllItems();
    const toRemove = items.filter(i => ids.includes(i.id));

    // Delete underlying S3 objects for items we own (have key)
    await Promise.all(
      toRemove
        .filter(i => i.key)
        .map(i => s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: i.key as string })))
    );

    const remaining = items.filter(i => !ids.includes(i.id));
    await saveAllItems(remaining);

    return NextResponse.json({ ok: true, deleted: toRemove.length, remaining: remaining.length });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete items" }, { status: 500 });
  }
}
