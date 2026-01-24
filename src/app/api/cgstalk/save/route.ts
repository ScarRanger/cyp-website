import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucket = process.env.CGS_TALKS_BUCKET;

const s3 = new S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    } : undefined,
});

function dirFromKey(key: string) {
    const parts = key.split("/");
    parts.pop();
    return parts.join("/");
}

export async function POST(req: NextRequest) {
    try {
        if (!bucket) {
            return NextResponse.json({ error: "CGS_TALKS_BUCKET not configured" }, { status: 500 });
        }

        const { mediaKey, summary } = await req.json();
        if (!mediaKey) return NextResponse.json({ error: "Missing mediaKey" }, { status: 400 });

        // Save summary.md if provided
        if (summary && typeof summary === "string" && summary.trim()) {
            const dir = dirFromKey(mediaKey);
            const key = `${dir}/summary.md`;
            const Body = Buffer.from(summary, "utf8");
            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body,
                ContentType: "text/markdown; charset=utf-8",
            }));
        }

        return NextResponse.json({ ok: true, mediaKey });
    } catch (e) {
        console.error("CGS save error:", e);
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}
