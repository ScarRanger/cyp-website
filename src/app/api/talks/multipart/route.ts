import { NextRequest, NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, TALKS_S3_BUCKET, TALKS_PUBLIC_BASEURL } from "@/app/lib/s3";

function slugify(v: string) {
  return (v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFilename(name: string) {
  const base = name.replace(/[^A-Za-z0-9._-]+/g, "-");
  return base.replace(/-+/g, "-");
}

function buildDir({ title, date, series }: { title: string; date?: string; series?: string }) {
  const t = slugify(title);
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dslug = `${y}-${mm}-${dd}`;
  
  // If series is provided, organize as: talks/<year>/<series>/<date>-<title>
  // If no series, keep as before: talks/<year>/<date>-<title>
  if (series) {
    const s = slugify(series);
    const leaf = [dslug, t].filter(Boolean).join("-");
    return `talks/${y}/${s}/${leaf}`;
  } else {
    const leaf = [dslug, t].filter(Boolean).join("-");
    return `talks/${y}/${leaf}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action as string | undefined;
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

    if (action === "create") {
      const { filename, contentType, title, date, series, kind } = body || {};
      if (!filename || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      const dir = buildDir({ title, date, series });
      const ext = (String(filename).split(".").pop() || "bin").toLowerCase();
      const safeName = sanitizeFilename(String(filename));
      let key = `${dir}/${safeName}`;
      if (kind === "thumbnail") {
        key = `${dir}/thumbnail.${ext}`;
      }
      const out = await s3.send(
        new CreateMultipartUploadCommand({
          Bucket: TALKS_S3_BUCKET,
          Key: key,
          ContentType: contentType || "application/octet-stream",
          CacheControl: kind === "thumbnail" ? "public, max-age=31536000, immutable" : undefined,
        })
      );
      const uploadId = out.UploadId;
      if (!uploadId) return NextResponse.json({ error: "Failed to init multipart" }, { status: 500 });
      const base = TALKS_PUBLIC_BASEURL || `https://${TALKS_S3_BUCKET}.s3.amazonaws.com`;
      const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;
      const mediaExt = ext;
      const type: "audio" | "video" = ["mp4", "m4v", "mov", "webm"].includes(mediaExt) ? "video" : "audio";
      return NextResponse.json({ uploadId, key, dir, publicUrl, type });
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
      const MAX_PARTS_PER_REQUEST = 100;
      if (sanitized.length > MAX_PARTS_PER_REQUEST) {
        return NextResponse.json({ error: `Too many parts requested; max ${MAX_PARTS_PER_REQUEST}` }, { status: 400 });
      }
      const entries = await Promise.all(
        sanitized.map(async (partNumber) => {
          const cmd = new UploadPartCommand({ Bucket: TALKS_S3_BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber });
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
        Bucket: TALKS_S3_BUCKET,
        Key: key as string,
        UploadId: uploadId as string,
        MultipartUpload: {
          Parts: (parts as Array<{ PartNumber: number; ETag: string }>).sort((a, b) => a.PartNumber - b.PartNumber),
        },
      };
      await s3.send(new CompleteMultipartUploadCommand(input));
      const base = TALKS_PUBLIC_BASEURL || `https://${TALKS_S3_BUCKET}.s3.amazonaws.com`;
      const publicUrl = `${base}${base.endsWith("/") ? "" : "/"}${key}`;
      return NextResponse.json({ key, publicUrl });
    }

    if (action === "abort") {
      const { key, uploadId } = body || {};
      if (!key || !uploadId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
      await s3.send(new AbortMultipartUploadCommand({ Bucket: TALKS_S3_BUCKET, Key: key, UploadId: uploadId }));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Multipart API error" }, { status: 500 });
  }
}
