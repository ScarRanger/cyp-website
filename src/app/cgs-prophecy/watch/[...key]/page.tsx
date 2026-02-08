import TalkPlayer from "../../../components/TalkPlayer";
import TalkShareButton from '@/app/components/TalkShareButton';
import { GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { redirect } from 'next/navigation';
import { ArrowLeft } from "lucide-react";
import { sanitizeHtml } from '@/app/lib/sanitize';

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


// Warm Espresso Theme Colors
const theme = {
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    text: '#FAFAFA',
    border: '#FB923C30',
};

function decodeKeyParam(param: string | string[]): string {
    const joined = Array.isArray(param) ? param.join("/") : param;
    try { return decodeURIComponent(joined); } catch { return joined; }
}

function renderMarkdown(md: string): string {
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    const out: string[] = [];
    let inList = false;
    for (const raw of lines) {
        const line = raw.trimEnd();
        if (/^\s*[-*]\s+/.test(line)) {
            if (!inList) { out.push("<ul class=\"list-disc pl-6 my-2\">"); inList = true; }
            const item = line.replace(/^\s*[-*]\s+/, "");
            out.push(`<li>${escapeHtml(item)}</li>`);
            continue;
        }
        if (inList && line === "") { out.push("</ul>"); inList = false; continue; }
        if (line === "") { out.push("<br/>"); continue; }
        out.push(`<p class=\"my-2\">${escapeHtml(line)}</p>`);
    }
    if (inList) out.push("</ul>");
    return out.join("\n");
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function bodyToString(body: any): Promise<string> {
    if (!body) return "";
    if (typeof body.transformToString === "function") return body.transformToString();
    if (typeof body.transformToByteArray === "function") {
        const arr: Uint8Array = await body.transformToByteArray();
        return new TextDecoder().decode(arr);
    }
    return "";
}

async function getSummary(key: string): Promise<string | null> {
    try {
        const dir = key.split('/').slice(0, -1).join('/');
        const summaryKey = `${dir}/summary.md`;
        const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: summaryKey }));
        const text = await bodyToString((out as any).Body);
        return text || null;
    } catch {
        return null;
    }
}

async function checkKeyExists(key: string): Promise<boolean> {
    try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
    } catch {
        return false;
    }
}

export default async function Page({ params }: { params: Promise<{ key: string[] }> }) {
    const p = await params;
    const key = decodeKeyParam(p?.key || []);

    const exists = await checkKeyExists(key);
    if (!exists) {
        // If we wanted redirects for moved content, we'd do search logic here.
        // For now, simpler: just 404 or show error state if not found.
        // But since this is a server component, we can let it render and the player might fail,
        // or we can show a UI message.
    }

    const filename = key.split("/").pop() || key;
    const title = filename.replace(/\.[^.]+$/, '').replace(/[\-_]+/g, ' ').trim();

    let summaryHtml: string | null = null;
    try {
        const summary = await getSummary(key);
        if (summary) summaryHtml = renderMarkdown(summary);
    } catch { }

    // Construct CloudFront URL
    const publicUrl = `https://${cdfDomain}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

    return (
        <div className="min-h-screen p-4" style={{ backgroundColor: theme.background, color: theme.text }}>
            <main className="mx-auto max-w-5xl">
                <div className="mb-6 flex items-center justify-between">
                    <a
                        href="/cgs-prophecy"
                        className="inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
                        style={{ color: theme.primary }}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Prophecies
                    </a>
                    <div className="ml-4">
                        <TalkShareButton title={title} />
                    </div>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 break-words" style={{ color: theme.text }}>{title}</h1>

                <div className="rounded-xl overflow-hidden shadow-2xl border mb-6" style={{ borderColor: theme.border, backgroundColor: '#000' }}>
                    {/* 
               We are reusing TalkPlayer if it supports arbitrary URLs. 
               If TalkPlayer expects an "objectKey" and derives the URL internally using talks bucket, 
               we might need to pass a property to override the URL or use a standard <video> tag.
               Let's check TalkPlayer implementation next. For now, assuming standard video tag as fallback 
               or if TalkPlayer is flexible. 
               
               Actually, scanning TalkPlayer usage in talks/.../page.tsx: 
               <TalkPlayer className="w-full aspect-video" objectKey={key} autoPlay={false} />
               
               I'll assume I should use a standard video tag here to be safe and simple 
               since TalkPlayer might be coupled to Talk Store/Bucket.
            */}
                    <video
                        src={publicUrl}
                        controls
                        className="w-full aspect-video"
                        style={{ display: 'block' }}
                        poster="/thumbnail-placeholder.png" // Optional: we could try to fetch a thumbnail if one exists
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {summaryHtml ? (
                    <div
                        className="mt-8 prose prose-invert max-w-none"
                        style={{ color: theme.text }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHtml) }}
                    />
                ) : null}
            </main>
        </div>
    );
}
