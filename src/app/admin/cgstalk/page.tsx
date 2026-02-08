"use client";

import React, { useState } from "react";
import AuthGuard from "@/app/components/Auth/AuthGuard";

function slugify(v: string) {
    return (v || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function AdminCGSTalksUploadPage() {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState<string>("");
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [thumbFile, setThumbFile] = useState<File | null>(null);
    const [summary, setSummary] = useState<string>("");
    const [uploadType, setUploadType] = useState<"talk" | "prophecy">("talk");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | undefined>(undefined);
    const [progress, setProgress] = useState<number>(0);

    const getPartSize = (fileSize: number) => {
        if (fileSize > 500 * 1024 * 1024) return 50 * 1024 * 1024;
        if (fileSize > 100 * 1024 * 1024) return 25 * 1024 * 1024;
        return 10 * 1024 * 1024;
    };

    const requestPartUrls = async (key: string, uploadId: string, totalParts: number) => {
        const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);
        const MAX_PER_REQ = 100;
        const all: Record<number, string> = {};
        for (let i = 0; i < partNumbers.length; i += MAX_PER_REQ) {
            const chunk = partNumbers.slice(i, i + MAX_PER_REQ);
            const res = await fetch("/api/cgstalk/multipart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "parts", key, uploadId, partNumbers: chunk, type: uploadType }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || "Failed to get part URLs");
            Object.assign(all, data.urls || {});
        }
        return all;
    };

    const multipartUploadFile = async (file: File, payload: { kind?: "thumbnail" | undefined }): Promise<{ key: string }> => {
        const { kind } = payload;
        const createRes = await fetch("/api/cgstalk/multipart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create",
                filename: file.name,
                contentType: file.type || "application/octet-stream",
                title,
                date: date || undefined,
                kind,
                type: uploadType,
            }),
        });
        const created = await createRes.json().catch(() => ({}));
        if (!createRes.ok) throw new Error(created?.error || "Failed to init multipart");
        const { uploadId, key } = created as { uploadId: string; key: string };

        const PART_SIZE = getPartSize(file.size);
        const totalParts = Math.ceil(file.size / PART_SIZE);
        const urls = await requestPartUrls(key, uploadId, totalParts);

        let uploadedBytes = 0;
        const perPartLoaded: Record<number, number> = {};
        const partsOut: Array<{ PartNumber: number; ETag: string }> = [];

        let currentConcurrency = 1;
        let successCount = 0;
        const MAX_CONCURRENCY = 4;

        const adjustConcurrency = (success: boolean) => {
            if (success) {
                successCount++;
                if (successCount >= 3 && currentConcurrency < MAX_CONCURRENCY) {
                    currentConcurrency++;
                    successCount = 0;
                }
            } else {
                successCount = 0;
                if (currentConcurrency > 1) {
                    currentConcurrency = Math.max(1, Math.floor(currentConcurrency / 2));
                }
            }
        };

        const uploadPart = async (partNumber: number, maxRetries = 5) => {
            const start = (partNumber - 1) * PART_SIZE;
            const end = Math.min(start + PART_SIZE, file.size);
            const blob = file.slice(start, end);
            const url = urls[partNumber];

            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    const etag = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open("PUT", url);
                        // Do NOT set Content-Type for parts, as it can cause signature mismatches 
                        // and isn't needed for partial uploads.
                        xhr.timeout = Math.max(120000, (blob.size / 1024 / 1024) * 2000) * (attempt + 1);

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                const loaded = e.loaded;
                                const prev = perPartLoaded[partNumber] || 0;
                                perPartLoaded[partNumber] = loaded;
                                uploadedBytes += Math.max(0, loaded - prev);
                                const pct = Math.min(100, (uploadedBytes / file.size) * 100);
                                setProgress(pct);
                            }
                        };

                        xhr.onerror = () => reject(new Error("Network error"));
                        xhr.ontimeout = () => reject(new Error("Upload timeout"));
                        xhr.onabort = () => reject(new Error("Upload aborted"));
                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                const et = xhr.getResponseHeader("ETag") || "";
                                const finalLoaded = perPartLoaded[partNumber] || 0;
                                if (finalLoaded < blob.size) {
                                    uploadedBytes += blob.size - finalLoaded;
                                    perPartLoaded[partNumber] = blob.size;
                                    setProgress(Math.min(100, (uploadedBytes / file.size) * 100));
                                }
                                resolve(et);
                            } else {
                                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                            }
                        };
                        xhr.send(blob);
                    });

                    partsOut.push({ PartNumber: partNumber, ETag: etag });
                    adjustConcurrency(true);
                    return;
                } catch (err: any) {
                    adjustConcurrency(false);
                    if (attempt < maxRetries) {
                        const delay = Math.min(30000, 1000 * Math.pow(2, attempt)) + Math.random() * 1000;
                        const prev = perPartLoaded[partNumber] || 0;
                        uploadedBytes -= prev;
                        perPartLoaded[partNumber] = 0;
                        setProgress(Math.max(0, (uploadedBytes / file.size) * 100));
                        await new Promise((r) => setTimeout(r, delay));
                    } else {
                        throw new Error(`Part ${partNumber} failed after ${maxRetries + 1} attempts: ${err.message}`);
                    }
                }
            }
        };

        const partQueue = Array.from({ length: totalParts }, (_, i) => i + 1);
        const activeUploads = new Set<Promise<void>>();

        while (partQueue.length > 0 || activeUploads.size > 0) {
            while (partQueue.length > 0 && activeUploads.size < currentConcurrency) {
                const partNumber = partQueue.shift();
                if (partNumber) {
                    const uploadPromise = uploadPart(partNumber).finally(() => {
                        activeUploads.delete(uploadPromise);
                    });
                    activeUploads.add(uploadPromise);
                }
            }
            if (activeUploads.size > 0) {
                await Promise.race(activeUploads);
            }
        }

        partsOut.sort((a, b) => a.PartNumber - b.PartNumber);

        const completeRes = await fetch("/api/cgstalk/multipart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "complete", key, uploadId, parts: partsOut, type: uploadType }),
        });
        const completed = await completeRes.json().catch(() => ({}));
        if (!completeRes.ok) throw new Error(completed?.error || "Failed to complete upload");

        return { key: completed.key as string };
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(undefined);
        setError(undefined);
        setProgress(0);
        try {
            if (!title.trim()) throw new Error("Title is required");
            if (!mediaFile) throw new Error("Select a video/audio file");

            const mediaOut = await multipartUploadFile(mediaFile, {});
            if (thumbFile) {
                await multipartUploadFile(thumbFile, { kind: "thumbnail" });
            }

            // Save summary if provided
            if (summary.trim()) {
                const saveRes = await fetch("/api/cgstalk/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mediaKey: mediaOut.key, summary, type: uploadType }),
                });
                if (!saveRes.ok) {
                    const data = await saveRes.json().catch(() => ({}));
                    throw new Error(data?.error || "Failed to save summary");
                }
            }

            setMessage("CGS Talk uploaded successfully!");
            setTitle("");
            setDate("");
            setMediaFile(null);
            setThumbFile(null);
            setSummary("");
            setProgress(0);
        } catch (err: any) {
            setError(err?.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "mt-1 w-full border border-[#FB923C]/30 focus:border-[#FB923C] focus:ring-[#FB923C] rounded-md px-3 py-2 text-[#FAFAFA] bg-white/5 placeholder:text-[#FAFAFA]/30";
    const labelClass = "block text-sm font-medium text-[#FAFAFA]/90";
    const fileInputClass =
        "block w-full text-sm text-[#FAFAFA] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#FB923C] file:text-[#1C1917] hover:file:bg-[#FCD34D]";

    return (
        <AuthGuard>
            <div className="min-h-[calc(100vh-4rem)] bg-[#1C1917]">
                <div className="max-w-4xl mx-auto p-6">
                    <div className="bg-[#1C1917] border border-[#FB923C]/30 rounded-xl shadow-sm">
                        <div className="border-b border-[#FB923C]/30 rounded-t-xl p-6">
                            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA]">CGS Talks Upload</h1>
                            <p className="text-sm text-[#FAFAFA]/70 mt-1">Upload a talk to the CGS talks bucket.</p>
                        </div>

                        <form onSubmit={onSubmit} className="p-6 space-y-6">
                            <div className="rounded-lg border border-[#FB923C]/30 p-4 bg-white/5">
                                <div className="mb-3 text-sm font-medium text-[#FAFAFA]/90">Upload Target</div>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="uploadType"
                                            value="talk"
                                            checked={uploadType === "talk"}
                                            onChange={() => setUploadType("talk")}
                                            className="accent-[#FB923C]"
                                        />
                                        <span className="text-[#FAFAFA]">CGS Talk</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="uploadType"
                                            value="prophecy"
                                            checked={uploadType === "prophecy"}
                                            onChange={() => setUploadType("prophecy")}
                                            className="accent-[#FB923C]"
                                        />
                                        <span className="text-[#FAFAFA]">CGS Prophecy</span>
                                    </label>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#FB923C]/30 p-4 bg-white/5">
                                <div className="mb-3 text-sm font-medium text-[#FAFAFA]/90">Details</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Title</label>
                                        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className={inputClass}
                                            style={{ colorScheme: "dark" }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#FB923C]/30 p-4 bg-white/5">
                                <div className="mb-3 text-sm font-medium text-[#FAFAFA]/90">Files</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Thumbnail (optional)</label>
                                        <div className="mt-1 rounded-md border border-[#FB923C]/30 p-3 bg-white/5">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setThumbFile((e.target.files && e.target.files[0]) || null)}
                                                className={fileInputClass}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Video/Audio File</label>
                                        <div className="mt-1 rounded-md border border-[#FB923C]/30 p-3 bg-white/5">
                                            <input
                                                type="file"
                                                accept="video/*,audio/*"
                                                onChange={(e) => setMediaFile((e.target.files && e.target.files[0]) || null)}
                                                className={fileInputClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-[#FB923C]/30 p-4 bg-white/5">
                                <label className={labelClass}>Summary / Notes (Markdown supported)</label>
                                <textarea
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={8}
                                    className={`${inputClass} whitespace-pre-wrap min-h-40`}
                                    placeholder="Add notes with - bullets and line breaks"
                                />
                                {progress > 0 && progress < 100 && (
                                    <div className="mt-2 h-2 w-full bg-white/10 rounded">
                                        <div className="h-2 bg-[#FB923C] rounded" style={{ width: `${Math.floor(progress)}%` }} />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-5 py-3 rounded-md bg-[#FB923C] text-[#1C1917] hover:bg-[#FCD34D] disabled:opacity-50 shadow font-semibold"
                                >
                                    {loading ? "Uploading…" : "Upload Talk"}
                                </button>
                                {message ? <div className="text-sm text-green-500">{message}</div> : null}
                                {error ? <div className="text-sm text-red-500">{error}</div> : null}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
