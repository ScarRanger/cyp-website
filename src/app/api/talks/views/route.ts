import { NextRequest, NextResponse } from "next/server";
import {
    incrementViewCount,
    getViewCount,
    getViewCounts,
} from "@/app/lib/redis";

/**
 * POST /api/talks/views
 * Increment view count for a talk
 * Body: { key: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { key } = await req.json();

        if (!key || typeof key !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid 'key' parameter" },
                { status: 400 }
            );
        }

        const newCount = await incrementViewCount(key);

        return NextResponse.json({ key, viewCount: newCount });
    } catch (error) {
        console.error("Error in POST /api/talks/views:", error);
        return NextResponse.json(
            { error: "Failed to increment view count" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/talks/views
 * Get view counts for one or more talks
 * Query params:
 *   - key: single talk key
 *   - keys: comma-separated list of talk keys
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const singleKey = searchParams.get("key");
        const multipleKeys = searchParams.get("keys");

        if (singleKey) {
            const viewCount = await getViewCount(singleKey);
            return NextResponse.json({ key: singleKey, viewCount });
        }

        if (multipleKeys) {
            const keys = multipleKeys.split(",").filter(Boolean);

            if (keys.length === 0) {
                return NextResponse.json({ error: "No valid keys provided" }, { status: 400 });
            }

            const counts = await getViewCounts(keys);
            const result: Record<string, number> = {};

            counts.forEach((count, key) => {
                result[key] = count;
            });

            return NextResponse.json({ viewCounts: result });
        }

        return NextResponse.json(
            { error: "Missing 'key' or 'keys' parameter" },
            { status: 400 }
        );
    } catch (error) {
        console.error("Error in GET /api/talks/views:", error);
        return NextResponse.json(
            { error: "Failed to get view counts" },
            { status: 500 }
        );
    }
}
