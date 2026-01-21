"use client";

import React, { useState, useEffect, useRef } from "react";
import AuthGuard from "@/app/components/Auth/AuthGuard"; // Assuming AuthGuard is needed as per the other page
import { ArrowLeft, Upload, Loader2, Copy, Download, RefreshCw, Archive } from "lucide-react";
import Link from "next/link";

interface UploadedFile {
    Key: string;
    Size: number;
    LastModified: string;
    Url: string;
    Name: string;
}

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
const MAX_CONCURRENT_UPLOADS = 3;

// Theme constants
const theme = {
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    text: '#FAFAFA',
    border: '#FB923C30',
};

export default function RawFilesPage() {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currFile, setCurrFile] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/upload/list", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to fetch files");
            const data = await res.json();
            setFiles(data.items || []);
        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Failed to load files." });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        await uploadFile(file);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadFile = async (file: File) => {
        setUploading(true);
        setProgress(0);
        setCurrFile(file.name);
        setMessage(null);

        try {
            // 1. Initiate Multipart Upload
            const initRes = await fetch("/api/upload/multipart", {
                method: "POST",
                body: JSON.stringify({ action: "create", filename: file.name, contentType: file.type }),
            });
            if (!initRes.ok) throw new Error("Failed to initiate upload");
            const { uploadId, key } = await initRes.json();

            // 2. Upload Parts
            const totalParts = Math.ceil(file.size / CHUNK_SIZE);
            const parts: { PartNumber: number; ETag: string }[] = [];
            const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

            const uploadPart = async (partNum: number) => {
                const start = (partNum - 1) * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                const sigRes = await fetch("/api/upload/multipart", {
                    method: "POST",
                    body: JSON.stringify({ action: "parts", key, uploadId, partNumbers: [partNum] }),
                });
                if (!sigRes.ok) throw new Error(`Failed to sign part ${partNum}`);
                const { urls } = await sigRes.json();
                const signedUrl = urls[partNum];

                const uploadRes = await fetch(signedUrl, {
                    method: "PUT",
                    body: chunk,
                });
                if (!uploadRes.ok) throw new Error(`Failed to upload part ${partNum}`);

                const etag = uploadRes.headers.get("ETag");
                if (!etag) throw new Error(`No ETag for part ${partNum}`);

                return { PartNumber: partNum, ETag: etag.replace(/"/g, "") };
            };

            for (let i = 0; i < partNumbers.length; i += MAX_CONCURRENT_UPLOADS) {
                const batch = partNumbers.slice(i, i + MAX_CONCURRENT_UPLOADS);
                const results = await Promise.all(batch.map(num => uploadPart(num)));
                parts.push(...results);

                const progressPercent = Math.round(((i + batch.length) / totalParts) * 100);
                setProgress(progressPercent);
            }

            // 3. Complete Upload
            const compRes = await fetch("/api/upload/multipart", {
                method: "POST",
                body: JSON.stringify({ action: "complete", key, uploadId, parts }),
            });
            if (!compRes.ok) throw new Error("Failed to complete upload");

            setMessage({ type: "success", text: "File uploaded successfully!" });
            fetchFiles();

        } catch (err) {
            console.error(err);
            setMessage({ type: "error", text: "Upload failed. Please try again." });
        } finally {
            setUploading(false);
            setCurrFile(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <AuthGuard>
            <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-6">
                        <Link
                            href="/admin"
                            className="inline-flex items-center gap-2 text-sm mb-4 transition-colors"
                            style={{ color: `${theme.text}B3` }} // opacity 70
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Admin
                        </Link>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold" style={{ color: theme.text }}>Video Assets</h1>
                                <p className="mt-1" style={{ color: `${theme.text}B3` }}>Manage large raw video uploads</p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: theme.primary, color: '#1C1917' }}
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {uploading ? "Uploading..." : "Upload New Video"}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept="video/*"
                            />
                        </div>
                    </div>

                    {/* Status Messages */}
                    {message && (
                        <div className={`mb-6 p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-red-900/20 border-red-500/30 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="mb-8 p-6 rounded-lg border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium" style={{ color: theme.primary }}>Uploading: {currFile}</span>
                                <span className="text-sm font-medium" style={{ color: theme.primary }}>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%`, backgroundColor: theme.primary }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* File List */}
                    <div className="rounded-lg shadow-sm overflow-hidden border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.primary }} />
                            </div>
                        ) : files.length === 0 ? (
                            <div className="p-12 text-center">
                                <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" style={{ color: theme.text }} />
                                <p className="text-lg opacity-70" style={{ color: theme.text }}>No video files found</p>
                                <p className="text-sm opacity-50 mb-6" style={{ color: theme.text }}>Upload a large video file to get started</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white/5 border-b" style={{ borderColor: theme.border }}>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: theme.text }}>File Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: theme.text }}>Size</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: theme.text }}>Last Modified</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider opacity-70" style={{ color: theme.text }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y`} style={{ borderColor: `${theme.border}50` }}>
                                        {/* Using hex opacity for divide color manually since tailwind arbitrary values can be tricky with vars */}
                                        {files.map((file) => (
                                            <tr key={file.Key} className="hover:bg-white/5 transition-colors" style={{ borderBottomColor: theme.border }}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium truncate max-w-xs" style={{ color: theme.text }} title={file.Name}>
                                                        {file.Name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm opacity-70" style={{ color: theme.text }}>{formatSize(file.Size)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm opacity-70" style={{ color: theme.text }}>{formatDate(file.LastModified)}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(file.Url);
                                                            setMessage({ type: "success", text: "URL Copied to clipboard!" });
                                                            setTimeout(() => setMessage(null), 3000);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white/10"
                                                        style={{ color: theme.primary, border: `1px solid ${theme.border}` }}
                                                        title="Copy URL"
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Copy</span>
                                                    </button>
                                                    <a
                                                        href={file.Url}
                                                        download
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white/10"
                                                        style={{ color: '#4ADE80', border: '1px solid #4ADE8040' }} // Green-400
                                                        title="Download"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">Download</span>
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthGuard>
    );
}
