import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import crypto from "crypto";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_TALKS_S3_BUCKET || process.env.CGS_TALKS_BUCKET;

const s3 = new S3Client({ region });

function isSafePrefix(v?: string | null) {
  if (!v) return true;
  if (v.startsWith("/")) return false;
  if (v.includes("..")) return false;
  if (v.startsWith("http://") || v.startsWith("https://")) return false;
  return /^[A-Za-z0-9/_-]*$/.test(v);
}

export async function GET(req: NextRequest) {
  try {
    if (!bucket || !region) {
      return NextResponse.json({ error: "Missing AWS_REGION or bucket env (AWS_TALKS_S3_BUCKET/CGS_TALKS_BUCKET)" }, { status: 500 });
    }

    const { searchParams } = req.nextUrl;
    const prefix = searchParams.get("prefix") || undefined;
    const token = searchParams.get("continuationToken") || undefined;
    const maxKeysParam = searchParams.get("maxKeys");
    const maxKeys = maxKeysParam ? Math.min(Math.max(parseInt(maxKeysParam, 10) || 0, 1), 1000) : 100;

    if (!isSafePrefix(prefix)) {
      return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
    }

    const out = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: token,
      MaxKeys: maxKeys,
    }));

    const items = (out.Contents || []).map(o => ({
      Key: o.Key || "",
      Size: o.Size || 0,
      LastModified: o.LastModified ? new Date(o.LastModified).toISOString() : undefined,
    })).filter(x => !!x.Key);

    const payload = {
      items,
      isTruncated: !!out.IsTruncated,
      nextContinuationToken: out.NextContinuationToken || null,
      keyCount: out.KeyCount || items.length,
      prefix: prefix || null,
    };

    const body = JSON.stringify(payload);
    const etag = 'W/"' + crypto.createHash("sha1").update(body).digest("hex") + '"';

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ETag: etag,
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
  }
}
