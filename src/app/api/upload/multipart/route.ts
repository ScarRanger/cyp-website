import { NextRequest, NextResponse } from "next/server";
import {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, ASSETS_S3_BUCKET } from "@/app/lib/s3";

// Helper to sanitize filenames
function sanitizeFilename(name: string) {
    const base = name.replace(/[^A-Za-z0-9._-]+/g, "-");
    return base.replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const action = body?.action as string | undefined;
        if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });

        const CLOUDFRONT_URL = process.env.AWS_ASSETS_CLOUDFRONT_URL;

        // 1. INITIATE MULTIPART UPLOAD
        if (action === "create") {
            const { filename, contentType } = body || {};
            if (!filename) return NextResponse.json({ error: "Missing filename" }, { status: 400 });

            const safeName = sanitizeFilename(String(filename));
            // Store in raw_files/ folder
            const key = `raw_files/${Date.now()}-${safeName}`;

            const out = await s3.send(
                new CreateMultipartUploadCommand({
                    Bucket: ASSETS_S3_BUCKET,
                    Key: key,
                    ContentType: contentType || "application/octet-stream",
                    // Long cache for static video assets
                    CacheControl: "public, max-age=31536000, immutable",
                })
            );

            const uploadId = out.UploadId;
            if (!uploadId) return NextResponse.json({ error: "Failed to init multipart" }, { status: 500 });

            return NextResponse.json({ uploadId, key });
        }

        // 2. GENERATE PRESIGNED URLS FOR PARTS
        if (action === "parts") {
            const { key, uploadId, partNumbers } = body || {};
            if (!key || !uploadId || !Array.isArray(partNumbers) || partNumbers.length === 0) {
                return NextResponse.json({ error: "Missing fields" }, { status: 400 });
            }

            const sanitized = (partNumbers as unknown[])
                .map((n) => Number(n))
                .filter((n) => Number.isInteger(n) && n > 0);

            if (!sanitized.length) return NextResponse.json({ error: "Invalid partNumbers" }, { status: 400 });

            // Safety cap
            const MAX_PARTS_PER_REQUEST = 100;
            if (sanitized.length > MAX_PARTS_PER_REQUEST) {
                return NextResponse.json({ error: `Too many parts requested; max ${MAX_PARTS_PER_REQUEST}` }, { status: 400 });
            }

            const entries = await Promise.all(
                sanitized.map(async (partNumber) => {
                    const cmd = new UploadPartCommand({
                        Bucket: ASSETS_S3_BUCKET,
                        Key: key,
                        UploadId: uploadId,
                        PartNumber: partNumber,
                    });
                    // URL valid for 1 hour
                    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
                    return [partNumber, url] as const;
                })
            );

            const urls: Record<number, string> = {};
            for (const [num, url] of entries) urls[num] = url;

            return NextResponse.json({ urls });
        }

        // 3. COMPLETE MULTIPART UPLOAD
        if (action === "complete") {
            const { key, uploadId, parts } = body || {};
            if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
                return NextResponse.json({ error: "Missing fields" }, { status: 400 });
            }

            const input = {
                Bucket: ASSETS_S3_BUCKET,
                Key: key as string,
                UploadId: uploadId as string,
                MultipartUpload: {
                    // Parts must be sorted by PartNumber
                    Parts: (parts as Array<{ PartNumber: number; ETag: string }>).sort((a, b) => a.PartNumber - b.PartNumber),
                },
            };

            await s3.send(new CompleteMultipartUploadCommand(input));

            const publicUrl = `${CLOUDFRONT_URL}/${key}`;
            return NextResponse.json({ key, publicUrl });
        }

        // 4. ABORT UPLOAD
        if (action === "abort") {
            const { key, uploadId } = body || {};
            if (!key || !uploadId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

            await s3.send(new AbortMultipartUploadCommand({ Bucket: ASSETS_S3_BUCKET, Key: key, UploadId: uploadId }));
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (e) {
        console.error("Multipart API error:", e);
        return NextResponse.json({ error: "Multipart API error" }, { status: 500 });
    }
}
