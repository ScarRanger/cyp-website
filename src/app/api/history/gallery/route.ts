import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION;
// Use assets bucket served via CloudFront
const bucket = process.env.AWS_ASSESTS_S3_BUCKET || "cyp-website-assets";
const CLOUDFRONT_URL = process.env.AWS_ASSETS_CLOUDFRONT_URL;
const GALLERY_PREFIX = "images/history/gallery/";

const s3 = new S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
});

// Supported image extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];

function isImageFile(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerKey.endsWith(ext));
}

function generateCaption(key: string): string {
    // Extract filename from key
    const filename = key.split("/").pop() || key;
    // Remove extension
    const name = filename.replace(/\.[^.]+$/, "");
    // Decode URL encoding and convert to readable caption
    const decoded = decodeURIComponent(name);
    // Convert camelCase/snake_case to Title Case
    return decoded
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

export async function GET() {
    try {
        if (!bucket || !region) {
            return NextResponse.json(
                { error: "Missing AWS_REGION or AWS_S3_BUCKET env" },
                { status: 500 }
            );
        }

        const result = await s3.send(new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: GALLERY_PREFIX,
        }));

        const images = (result.Contents || [])
            .filter(obj => obj.Key && isImageFile(obj.Key))
            .map(obj => {
                const key = obj.Key!;
                // URL encode the path properly for CloudFront
                const encodedPath = key.split("/").map(segment => encodeURIComponent(segment)).join("/");
                return {
                    src: `${CLOUDFRONT_URL}/${encodedPath}`,
                    caption: generateCaption(key),
                };
            });

        return NextResponse.json({ gallery: images }, {
            headers: {
                "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            },
        });
    } catch (err) {
        console.error("Failed to list gallery images:", err);
        return NextResponse.json(
            { error: "Failed to list gallery images" },
            { status: 500 }
        );
    }
}
