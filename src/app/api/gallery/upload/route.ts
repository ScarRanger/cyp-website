import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET, S3_PUBLIC_BASEURL } from "@/app/lib/s3";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const type = (form.get("type") as string) || "image"; // image|video
    const category = (form.get("category") as string) || "uncategorized";

    const arrayBuf = await file.arrayBuffer();
    const bytes = Buffer.from(arrayBuf);
    const fileExt = (file.name.split(".").pop() || "bin").toLowerCase();
    const key = `gallery/assets/${type}/${category}/${randomUUID()}.${fileExt}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: bytes,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com/`;
    const publicUrl = base.endsWith("/") ? `${base}${key}` : `${base}/${key}`;

    return NextResponse.json({ url: publicUrl, key });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
