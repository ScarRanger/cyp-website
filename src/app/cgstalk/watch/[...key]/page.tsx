import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import SecureVideoPlayer from "../../../components/SecureVideoPlayer";
import NoDownload from "../../../components/NoDownload";
import { ArrowLeft } from "lucide-react";
import { sanitizeHtml } from '@/app/lib/sanitize';

// Warm Espresso Theme Colors
const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

const region = process.env.AWS_REGION;
const bucket = process.env.CGS_TALKS_BUCKET;

const s3 = new S3Client({ region });

function decodeKeyParam(param: string | string[]): string {
  const joined = Array.isArray(param) ? param.join("/") : param;
  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push("<ul class=\"list-disc pl-6 my-2 text-[#FAFAFA]/90\">"); inList = true; }
      const item = line.replace(/^\s*[-*]\s+/, "");
      out.push(`<li class="my-1">${escapeHtml(item)}</li>`);
      continue;
    }
    if (inList && line === "") { out.push("</ul>"); inList = false; continue; }
    if (line === "") { out.push("<br/>"); continue; }
    out.push(`<p class="my-2 text-[#FAFAFA]/90">${escapeHtml(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

async function bodyToString(body: any): Promise<string> {
  if (!body) return "";
  if (typeof body.transformToString === "function") return body.transformToString();
  if (typeof body.transformToByteArray === "function") {
    const arr: Uint8Array = await body.transformToByteArray();
    return new TextDecoder().decode(arr);
  }
  if (typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    return new TextDecoder().decode(merged);
  }
  return "";
}

async function getSummary(key: string): Promise<string | null> {
  if (!bucket) return null;
  try {
    const dir = key.split('/').slice(0, -1).join('/');
    const summaryKey = dir ? `${dir}/summary.md` : null;

    if (!summaryKey) return null;

    try {
      const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: summaryKey }));
      const text = await bodyToString((out as any).Body);
      return text || null;
    } catch {
      if (!dir) return null;
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${dir}/` }));
      const items = (list.Contents || []).map(o => o.Key || "").filter(Boolean);
      const found = items.find(k => k.split('/').pop()!.toLowerCase() === 'summary.md');
      if (!found) return null;
      const alt = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: found }));
      const text = await bodyToString((alt as any).Body);
      return text || null;
    }
  } catch {
    return null;
  }
}

function getTitleFromKey(key: string): string {
  const parts = key.split('/');
  if (parts.length >= 2) {
    const dirName = parts[parts.length - 2];
    return dirName.replace(/[-_]+/g, ' ').trim();
  }
  const filename = parts[parts.length - 1] || key;
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

export default async function Page({ params }: { params: Promise<{ key: string[] }> }) {
  const p = await params;
  const key = decodeKeyParam(p?.key || []);
  const title = getTitleFromKey(key);

  let summaryHtml: string | null = null;
  try {
    const summary = await getSummary(key);
    if (summary) summaryHtml = renderMarkdown(summary);
  } catch { }

  return (
    <NoDownload>
      <div className="min-h-screen p-4" style={{ backgroundColor: theme.background, color: theme.text }}>
        <main className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center">
            <a
              href="/cgstalk"
              className="inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: theme.primary }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to CGS Talks
            </a>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 break-words" style={{ color: theme.text }}>
            {title || "CGS Talks"}
          </h1>
          <div className="text-xs mb-6 opacity-50 break-words" style={{ color: theme.text }}>{key}</div>

          <div className="rounded-xl overflow-hidden shadow-2xl border" style={{ borderColor: theme.border, backgroundColor: '#000' }}>
            <SecureVideoPlayer className="w-full aspect-video" videoKey={key} autoPlay={false} />
          </div>

          {summaryHtml && (
            <div
              className="mt-8 rounded-xl border p-6"
              style={{ borderColor: theme.border, backgroundColor: theme.surface }}
            >
              <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primary }}>Notes</h2>
              <div
                className="prose prose-invert max-w-none"
                style={{ color: theme.text }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(summaryHtml) }}
              />
            </div>
          )}
        </main>
      </div>
    </NoDownload>
  );
}
