import TalkPlayer from "../../../components/TalkPlayer";
import TalkShareButton from '@/app/components/TalkShareButton';
import ViewCounter from '@/app/components/ViewCounter';
import { GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3, TALKS_S3_BUCKET } from "@/app/lib/s3";
import { redirect } from 'next/navigation';
import { getAllTalks } from "@/app/lib/talksStore";
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
  try {
    const dir = key.split('/').slice(0, -1).join('/');
    const summaryKey = `${dir}/summary.md`;

    try {
      const out = await s3.send(new GetObjectCommand({ Bucket: TALKS_S3_BUCKET, Key: summaryKey }));
      const text = await bodyToString((out as any).Body);
      return text || null;
    } catch {
      // Fallback: only search within the same directory (case-insensitive filename).
      // If there is no directory (root-level key), don't list the entire bucket — return null.
      if (!dir) return null;
      const list = await s3.send(new ListObjectsV2Command({ Bucket: TALKS_S3_BUCKET, Prefix: `${dir}/` }));
      const items = (list.Contents || []).map(o => o.Key || "").filter(Boolean);
      const found = items.find(k => k.split('/').pop()!.toLowerCase() === 'summary.md');
      if (!found) return null;
      const alt = await s3.send(new GetObjectCommand({ Bucket: TALKS_S3_BUCKET, Key: found }));
      const text = await bodyToString((alt as any).Body);
      return text || null;
    }
  } catch {
    return null;
  }
}

async function getTalkTitle(key: string): Promise<string> {
  try {
    // Directly use the talks store instead of API call
    const talks = await getAllTalks();
    const talk = talks.find((item: any) => (item.key || item.id) === key);
    if (talk?.title) return talk.title;
  } catch {
    // Fall back to deriving title from filename
  }

  // Fallback: derive title from filename using the same logic as the API
  const filename = key.split("/").pop() || key;
  return filename.replace(/\.[^.]+$/, '').replace(/[\-_]+/g, ' ').trim();
}

async function checkKeyExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: TALKS_S3_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function findNewKeyForOldKey(oldKey: string): Promise<string | null> {
  try {
    // Directly use the talks store instead of API call
    const items = await getAllTalks();

    // Extract filename from old key
    const oldFilename = oldKey.split('/').pop();
    if (!oldFilename) return null;

    // Try to find a talk with the same filename
    for (const item of items) {
      const itemKey = item.key || item.id;
      const itemFilename = itemKey.split('/').pop();
      if (itemFilename === oldFilename) {
        return itemKey;
      }
    }

    // Alternative: try to match by title from the old directory structure
    // Old format: talks/<year>/<date>-<series>-<title>/<file>
    // Extract title from old path and match
    const pathParts = oldKey.split('/');
    if (pathParts.length >= 3) {
      const oldDirName = pathParts[2]; // e.g., "2025-11-12-romans-faith"

      for (const item of items) {
        const itemKey = item.key || item.id;
        const itemDirName = itemKey.split('/').slice(-2, -1)[0]; // Get directory name
        const itemFilename = itemKey.split('/').pop();

        // Check if filename matches and directory contains similar parts
        if (itemFilename === oldFilename) {
          return itemKey;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding new key:', error);
    return null;
  }
}

export default async function Page({ params }: { params: Promise<{ key: string[] }> }) {
  const p = await params;
  const key = decodeKeyParam(p?.key || []);

  // Check if the key exists in S3
  const exists = await checkKeyExists(key);

  // If key doesn't exist, try to find the new location and redirect
  if (!exists) {
    const newKey = await findNewKeyForOldKey(key);
    if (newKey) {
      // Redirect to the new URL
      const newPath = `/talks/watch/${encodeURIComponent(newKey).replace(/%2F/g, "/")}`;
      redirect(newPath);
    }
    // If we can't find the new key, continue anyway - the player will show an error
  }

  const title = await getTalkTitle(key);

  let summaryHtml: string | null = null;
  try {
    const summary = await getSummary(key);
    if (summary) summaryHtml = renderMarkdown(summary);
  } catch { }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: theme.background, color: theme.text }}>
      <main className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/talks"
            className="inline-flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
            style={{ color: theme.primary }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Talks
          </a>
          <div className="ml-4">
            <TalkShareButton title={title} />
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 break-words" style={{ color: theme.text }}>{title}</h1>
        <ViewCounter talkKey={key} className="mb-6" />
        {/* Video object key removed from public view for privacy/security */}
        <div className="rounded-xl overflow-hidden shadow-2xl border" style={{ borderColor: theme.border, backgroundColor: '#000' }}>
          <TalkPlayer className="w-full aspect-video" objectKey={key} autoPlay={false} />
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
