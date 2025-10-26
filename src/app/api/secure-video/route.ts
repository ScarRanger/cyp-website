import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

function isAuthorized(req: NextRequest): boolean {
  const required = process.env.AUTH_TOKEN;
  if (!required) return true;
  const headerToken = req.headers.get("x-auth-token") || req.nextUrl.searchParams.get("token");
  return headerToken === required;
}

function isSafeVideoKey(key: string): boolean {
  if (!key) return false;
  const normalized = key.replace(/\+/g, " ");
  if (normalized.startsWith("/")) return false;
  if (normalized.includes("..")) return false;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return false;
  // Allow spaces and common filename symbols: dash, underscore, dot, slash, parentheses
  return /^[A-Za-z0-9\s/_\-.()]+$/.test(normalized);
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributionUrl = process.env.CF_DISTRIBUTION_URL;
    const keyPairId = process.env.CF_KEY_PAIR_ID;
    const privateKeyBase64 = process.env.CF_PRIVATE_KEY_BASE64;
    const privateKeyEnv = process.env.CF_PRIVATE_KEY;
    const privateKey = privateKeyBase64
      ? Buffer.from(privateKeyBase64, "base64").toString("utf8")
      : privateKeyEnv;

    if (!distributionUrl || !keyPairId || !privateKey) {
      return NextResponse.json({ error: "Missing CloudFront env configuration" }, { status: 500 });
    }

    const { searchParams } = req.nextUrl;
    const rawKey = searchParams.get("key") || "";
    const videoKey = rawKey.replace(/\+/g, " ");

    if (!isSafeVideoKey(videoKey)) {
      return NextResponse.json({ error: "Invalid video key" }, { status: 400 });
    }

    const base = distributionUrl.replace(/\/$/, "");
    const encodedKey = videoKey.split('/').map(encodeURIComponent).join('/');
    const url = `${base}/${encodedKey}`;

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const signedUrl = getSignedUrl({
      url,
      dateLessThan: expiresAt,
      keyPairId,
      privateKey,
    });

    return NextResponse.json({ url: signedUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Error generating signed URL", err);
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
  }
}
