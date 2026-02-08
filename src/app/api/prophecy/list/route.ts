import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
const bucket = process.env.CGS_PROPHECY_BUCKET || "cgs-prophecy";
const cdfDomain = process.env.NEXT_PUBLIC_PROPHECY_CDF_DOMAIN || "d1ghr7s1ljkpgs.cloudfront.net";

const s3 = new S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    } : undefined,
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const continuationToken = searchParams.get("cursor") || undefined;
        const limit = parseInt(searchParams.get("limit") || "20", 10);

        const command = new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
            MaxKeys: limit,
        });

        const data = await s3.send(command);
        const contents = data.Contents || [];

        const items = contents
            .filter(item => {
                const key = item.Key;
                if (!key || key.endsWith("/")) return false;
                const ext = key.split('.').pop()?.toLowerCase();
                return ext && ['mp4', 'm4v', 'mov', 'webm', 'mp3', 'm4a', 'wav'].includes(ext);
            })
            .map(item => {
                const key = item.Key!;
                const filename = key.split('/').pop() || key;
                // Basic title extraction: remove extension and replace hyphens/underscores
                const title = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
                const ext = key.split('.').pop()?.toLowerCase();
                const type = ['mp4', 'm4v', 'mov', 'webm'].includes(ext || "") ? 'video' : 'audio';

                return {
                    id: key,
                    key,
                    title,
                    type,
                    createdAt: item.LastModified ? item.LastModified.toISOString() : new Date().toISOString(),
                    url: `https://${cdfDomain}/${key}`,
                };
            });

        // Sort by date descending (newest first) - Note: S3 listing is by UTF-8 binary order of keys
        // To strictly sort by date we'd need to fetch more and sort in memory, but for now 
        // relying on the client or folder structure (if YYYY/MM/DD) might be needed.
        // If the folder structure is YYYY/MM-DD-Title, then standard S3 list order assumes date order 
        // ONLY if we scan everything. 
        // For a simple list, we will just return what S3 gives, but let's do a client-side sort of this page at least.
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({
            items,
            nextCursor: data.IsTruncated ? data.NextContinuationToken : undefined,
        });

    } catch (e) {
        console.error("Prophecy list error:", e);
        return NextResponse.json({ error: "Failed to list prophecies" }, { status: 500 });
    }
}
