import { NextRequest, NextResponse } from "next/server";
import { S3_BUCKET, s3, S3_PUBLIC_BASEURL } from "@/app/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const { type, category, filename, contentType, year } = await req.json();
    if (!type || !category || !filename) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Use provided year or default to current year
    const yearStr = year || new Date().getFullYear();
    const ext = (filename.split(".").pop() || "bin").toLowerCase();
    const key = `gallery/assets/${yearStr}/${type}/${category}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutes

    const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com`;
    const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;

    return NextResponse.json({ url, key, publicUrl, headers: { "Content-Type": contentType || "application/octet-stream" } });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create presigned URL" }, { status: 500 });
  }
}
