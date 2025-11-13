import { NextRequest, NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, S3_PUBLIC_BASEURL } from "@/app/lib/s3";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string | undefined;
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

    if (action === "create") {
      const { type, category, filename, contentType, year } = body || {};
      if (!type || !category || !filename) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      // Use provided year or default to current year
      const yearStr = year || new Date().getFullYear();
      const ext = (String(filename).split(".").pop() || "bin").toLowerCase();
      const key = `gallery/assets/${yearStr}/${type}/${category}/${randomUUID()}.${ext}`;
      const out = await s3.send(new CreateMultipartUploadCommand({
        Bucket: S3_BUCKET,
        Key: key,
        ContentType: contentType || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }));
      const uploadId = out.UploadId;
      if (!uploadId) return NextResponse.json({ error: "Failed to init multipart" }, { status: 500 });
      const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com`;
      const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;
      return NextResponse.json({ uploadId, key, publicUrl });
    }

    if (action === "parts") {
      const { key, uploadId, partNumbers } = body || {};
      if (!key || !uploadId || !Array.isArray(partNumbers) || partNumbers.length === 0) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const sanitized = (partNumbers as unknown[])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (!sanitized.length) return NextResponse.json({ error: "Invalid partNumbers" }, { status: 400 });
      const MAX_PARTS_PER_REQUEST = 100; // keep under ~10s on Vercel Free
      if (sanitized.length > MAX_PARTS_PER_REQUEST) {
        return NextResponse.json({ error: `Too many parts requested; max ${MAX_PARTS_PER_REQUEST}` }, { status: 400 });
      }
      const entries = await Promise.all(
        sanitized.map(async (partNumber) => {
          const cmd = new UploadPartCommand({ Bucket: S3_BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber });
          const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
          return [partNumber, url] as const;
        })
      );
      const urls: Record<number, string> = {};
      for (const [num, url] of entries) urls[num] = url;
      return NextResponse.json({ urls });
    }

    if (action === "complete") {
      const { key, uploadId, parts } = body || {};
      if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      }
      const input = {
        Bucket: S3_BUCKET,
        Key: key as string,
        UploadId: uploadId as string,
        MultipartUpload: {
          Parts: (parts as Array<{ PartNumber: number; ETag: string }>).sort((a, b) => a.PartNumber - b.PartNumber),
        },
      };
      const out = await s3.send(new CompleteMultipartUploadCommand(input));
      const base = S3_PUBLIC_BASEURL || `https://${S3_BUCKET}.s3.amazonaws.com`;
      const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;
      return NextResponse.json({ location: out.Location, key, publicUrl });
    }

    if (action === "abort") {
      const { key, uploadId } = body || {};
      if (!key || !uploadId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      await s3.send(new AbortMultipartUploadCommand({ Bucket: S3_BUCKET, Key: key, UploadId: uploadId }));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Multipart API error" }, { status: 500 });
  }
}
