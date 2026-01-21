import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { s3, ASSETS_S3_BUCKET } from "@/app/lib/s3";

const CLOUDFRONT_URL = "https://ds33df8kutjjh.cloudfront.net";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const prefix = "raw_files/"; // Only list files in this directory
        const token = searchParams.get("continuationToken") || undefined;
        const maxKeysParam = searchParams.get("maxKeys");
        const maxKeys = maxKeysParam ? Math.min(Math.max(parseInt(maxKeysParam, 10) || 0, 1), 1000) : 50;

        const out = await s3.send(
            new ListObjectsV2Command({
                Bucket: ASSETS_S3_BUCKET,
                Prefix: prefix,
                ContinuationToken: token,
                MaxKeys: maxKeys,
            })
        );

        const items = (out.Contents || [])
            .map((o) => ({
                Key: o.Key || "",
                Size: o.Size || 0,
                LastModified: o.LastModified ? new Date(o.LastModified).toISOString() : undefined,
                Url: `${CLOUDFRONT_URL}/${o.Key}`,
                Name: (o.Key || "").replace(prefix, ""), // Display name without prefix
            }))
            .filter((x) => !!x.Key && x.Key !== prefix) // Filter out the directory itself if listed
            .sort((a, b) => {
                // Sort by LastModified descending (newest first)
                return (new Date(b.LastModified || 0).getTime() - new Date(a.LastModified || 0).getTime());
            });

        const payload = {
            items,
            isTruncated: !!out.IsTruncated,
            nextContinuationToken: out.NextContinuationToken || null,
            keyCount: out.KeyCount || items.length,
        };

        return NextResponse.json(payload, {
            headers: {
                "Cache-Control": "private, max-age=10", // Short cache for list
            },
        });
    } catch (err) {
        console.error("List API error:", err);
        return NextResponse.json({ error: "Failed to list objects" }, { status: 500 });
    }
}
