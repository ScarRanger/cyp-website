import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CopyObjectCommand } from "@aws-sdk/client-s3";
import { s3, TALKS_S3_BUCKET } from "@/app/lib/s3";
import { getAllTalks, saveAllTalks } from "@/app/lib/talksStore";
import type { TalkItem } from "@/app/types/talks";

function dirFromKey(key: string) {
  return key.split("/").slice(0, -1).join("/");
}

function slugify(v: string) {
  return (v || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildNewDir({ title, date, series }: { title: string; date?: string; series?: string }) {
  const t = slugify(title);
  const d = date ? new Date(date) : new Date();
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dslug = `${y}-${mm}-${dd}`;
  
  // If series is provided, organize as: talks/<year>/<series>/<date>-<title>
  // If no series, keep as before: talks/<year>/<date>-<title>
  if (series) {
    const s = slugify(series);
    const leaf = [dslug, t].filter(Boolean).join("-");
    return `talks/${y}/${s}/${leaf}`;
  } else {
    const leaf = [dslug, t].filter(Boolean).join("-");
    return `talks/${y}/${leaf}`;
  }
}

async function moveFilesInS3(oldDir: string, newDir: string): Promise<{ movedFiles: number; errors: string[] }> {
  const errors: string[] = [];
  let movedFiles = 0;

  try {
    // List all files in old directory
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: TALKS_S3_BUCKET,
        Prefix: `${oldDir}/`,
      })
    );

    const objects = listResponse.Contents || [];

    for (const obj of objects) {
      if (!obj.Key || obj.Key.endsWith('/')) continue;

      const filename = obj.Key.split('/').pop();
      if (!filename) continue;

      const newKey = `${newDir}/${filename}`;

      try {
        // Copy to new location
        await s3.send(
          new CopyObjectCommand({
            Bucket: TALKS_S3_BUCKET,
            CopySource: `${TALKS_S3_BUCKET}/${obj.Key}`,
            Key: newKey,
          })
        );

        // Delete old file
        await s3.send(
          new DeleteObjectCommand({
            Bucket: TALKS_S3_BUCKET,
            Key: obj.Key,
          })
        );

        movedFiles++;
      } catch (err: any) {
        errors.push(`Failed to move ${obj.Key}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Failed to list files in ${oldDir}: ${err.message}`);
  }

  return { movedFiles, errors };
}

export async function POST(req: NextRequest) {
  try {
    const { id, title, speaker, date, series, summary } = await req.json();
    if (!id || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const items = await getAllTalks();
    const index = items.findIndex((it) => it.id === id || it.key === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Talk not found" }, { status: 404 });
    }

    const oldItem = items[index];
    const oldKey = oldItem.key || oldItem.id;
    const oldDir = dirFromKey(oldKey);
    const oldSeries = oldItem.series;

    // Check if series, title, or date changed (which would require moving files)
    const seriesChanged = (series || undefined) !== (oldSeries || undefined);
    const titleChanged = title !== oldItem.title;
    const dateChanged = (date || undefined) !== (oldItem.date || undefined);
    const needsMove = seriesChanged || titleChanged || dateChanged;

    let newKey = oldKey;
    let newDir = oldDir;
    let moveResult: { movedFiles: number; errors: string[] } | undefined;

    if (needsMove) {
      // Calculate new directory structure
      newDir = buildNewDir({ title, date, series });
      
      // Only move if directory actually changed
      if (newDir !== oldDir) {
        moveResult = await moveFilesInS3(oldDir, newDir);
        
        // If there were errors, return them
        if (moveResult.errors.length > 0) {
          console.error("Errors moving files:", moveResult.errors);
          return NextResponse.json({ 
            error: "Failed to move some files", 
            details: moveResult.errors 
          }, { status: 500 });
        }

        // Update the key to point to new location
        const filename = oldKey.split('/').pop();
        newKey = `${newDir}/${filename}`;
      }
    }

    // Update the item with new metadata and key
    items[index] = {
      ...items[index],
      id: newKey,
      key: newKey,
      title,
      speaker: speaker || undefined,
      date: date || undefined,
      series: series || undefined,
    };

    // Update thumbnail key if it exists
    if (oldItem.thumbnailKey && needsMove && newDir !== oldDir) {
      const thumbFilename = oldItem.thumbnailKey.split('/').pop();
      items[index].thumbnailKey = `${newDir}/${thumbFilename}`;
    }

    await saveAllTalks(items);

    // Update summary if provided
    if (summary !== undefined) {
      const summaryKey = `${newDir}/summary.md`;
      
      if (summary === "" || summary === null) {
        // Delete summary if empty
        try {
          await s3.send(new DeleteObjectCommand({ Bucket: TALKS_S3_BUCKET, Key: summaryKey }));
        } catch {
          // Ignore if doesn't exist
        }
      } else {
        // Update summary
        const Body = Buffer.from(summary, "utf8");
        await s3.send(
          new PutObjectCommand({
            Bucket: TALKS_S3_BUCKET,
            Key: summaryKey,
            Body,
            ContentType: "text/markdown; charset=utf-8",
          })
        );
      }
    }

    return NextResponse.json({ 
      ok: true, 
      item: items[index],
      moved: moveResult ? moveResult.movedFiles : 0,
    });
  } catch (e) {
    console.error("Update error:", e);
    return NextResponse.json({ error: "Failed to update talk" }, { status: 500 });
  }
}
