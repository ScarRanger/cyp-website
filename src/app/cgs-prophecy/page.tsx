"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Music, Video as VideoIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import Spinner from "../components/Spinner";
import Image from "next/image";
import Link from "next/link";

type ProphecyItem = {
    key: string;
    title: string;
    type: "audio" | "video";
    createdAt: string;
    url: string;
};

type ProphecyResponse = {
    items: ProphecyItem[];
    nextCursor?: string;
};

// Warm Espresso Theme Colors
const theme = {
    background: '#1C1917',
    surface: '#1C1917',
    primary: '#FB923C',
    text: '#FAFAFA',
    border: '#FB923C30',
};

export default function ProphecyPage() {
    const [items, setItems] = useState<ProphecyItem[]>([]);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const hasMore = useMemo(() => Boolean(cursor), [cursor]);

    useEffect(() => {
        let ignore = false;
        async function load(initial = false) {
            try {
                setLoading(true);
                const qs = new URLSearchParams();
                if (!initial && cursor) qs.set("cursor", cursor);
                const res = await fetch(`/api/prophecy/list${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
                const data: ProphecyResponse = await res.json();
                if (ignore) return;
                setItems(prev => (initial ? data.items : [...prev, ...data.items]));
                setCursor(data.nextCursor);
            } catch {
                if (!ignore) setError("Failed to load prophecies");
            } finally {
                if (!ignore) setLoading(false);
            }
        }
        load(true);
        return () => {
            ignore = true;
        };
    }, []);

    async function loadMore() {
        if (!cursor || loading) return;
        try {
            setLoading(true);
            const qs = new URLSearchParams();
            if (cursor) qs.set("cursor", cursor);
            const res = await fetch(`/api/prophecy/list?${qs.toString()}`, { cache: "no-store" });
            const data: ProphecyResponse = await res.json();
            setItems(prev => [...prev, ...data.items]);
            setCursor(data.nextCursor);
        } catch {
            setError("Failed to load more");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: theme.background }}>
            <div className="mx-auto max-w-6xl">
                <h1 className="text-3xl font-bold tracking-tight mb-8" style={{ color: theme.text }}>Prophecies</h1>
                {error && (
                    <div className="mb-4 rounded border border-red-400 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                        {error}
                    </div>
                )}
                {items.length === 0 && loading ? (
                    <div className="py-16 flex justify-center">
                        <Spinner
                            label="Loading prophecies"
                            trackClassName="border-white/20"
                            ringClassName="border-t-[#FB923C]"
                            labelClassName="text-[#FAFAFA]"
                        />
                    </div>
                ) : null}

                {items.length === 0 && !loading && !error && (
                    <div className="text-center py-10 opacity-70" style={{ color: theme.text }}>
                        No prophecies found.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 rounded-xl overflow-hidden border" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                        <ul className="divide-y" style={{ borderColor: theme.border }}>
                            {items.map((it) => {
                                const href = `/cgs-prophecy/watch/${encodeURIComponent(it.key).replace(/%2F/g, "/")}`;
                                return (
                                    <li
                                        key={it.key}
                                        className="px-4 py-4 transition-colors hover:bg-white/5"
                                        style={{ borderColor: theme.border }}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <Link
                                                href={href}
                                                className="min-w-0 no-underline flex items-center gap-4 cursor-pointer flex-1"
                                            >
                                                <div className="h-16 w-16 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center shrink-0 border border-white/10">
                                                    <div className="text-gray-500">
                                                        {it.type === "video" ? (
                                                            <VideoIcon className="h-8 w-8" />
                                                        ) : (
                                                            <Music className="h-8 w-8" />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" style={{ borderColor: theme.border, color: theme.primary, backgroundColor: 'rgba(251, 146, 60, 0.1)' }}>
                                                            {it.type === "video" ? (
                                                                <VideoIcon className="h-3 w-3 mr-1" />
                                                            ) : (
                                                                <Music className="h-3 w-3 mr-1" />
                                                            )}
                                                            {it.type === "video" ? "Video" : "Audio"}
                                                        </span>
                                                    </div>
                                                    <div className="truncate font-semibold text-lg" style={{ color: theme.text }}>{it.title}</div>
                                                    <div className="flex items-center gap-2 text-sm mt-1 opacity-70" style={{ color: theme.text }}>
                                                        <span>
                                                            {(() => { const d = new Date(it.createdAt); const dd = String(d.getDate()).padStart(2, '0'); const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; const yyyy = d.getFullYear(); return `${dd} ${mon} ${yyyy}`; })()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                            <Button asChild size="sm" className="shrink-0 font-medium" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                                                <Link href={href}>Watch</Link>
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        {hasMore && (
                            <div className="p-4 border-t" style={{ borderColor: theme.border }}>
                                <Button
                                    className="w-full font-medium hover:opacity-90 transition-opacity"
                                    onClick={loadMore}
                                    disabled={loading}
                                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                                >
                                    {loading ? <Spinner label="Loading more" size={20} ringWidth={3} className="py-1" trackClassName="border-white/20" ringClassName="border-t-[#FB923C]" labelClassName="text-[#FAFAFA]" /> : "Load more"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
