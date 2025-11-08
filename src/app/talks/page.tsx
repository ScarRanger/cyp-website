"use client";

import { useEffect, useMemo, useState } from "react";
import { Music, Video as VideoIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import Spinner from "../components/Spinner";

type TalkItem = {
  id: string;
  key?: string;
  title: string;
  speaker?: string;
  date?: string;
  type: "audio" | "video";
  durationSeconds?: number;
  createdAt: string;
  thumbnailUrl?: string;
};

type TalksResponse = {
  items: TalkItem[];
  nextCursor?: string;
};

export default function Talks() {
  const [items, setItems] = useState<TalkItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<TalkItem | undefined>(undefined);
  const [playUrl, setPlayUrl] = useState<string | undefined>(undefined);
  const [resolving, setResolving] = useState(false);

  const hasMore = useMemo(() => Boolean(cursor), [cursor]);

  useEffect(() => {
    let ignore = false;
    async function load(initial = false) {
      try {
        setLoading(true);
        const qs = new URLSearchParams();
        if (!initial && cursor) qs.set("cursor", cursor);
        const res = await fetch(`/api/talks${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
        const data: TalksResponse = await res.json();
        if (ignore) return;
        setItems(prev => (initial ? data.items : [...prev, ...data.items]));
        setCursor(data.nextCursor);
      } catch {
        if (!ignore) setError("Failed to load talks");
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
      const res = await fetch(`/api/talks?${qs.toString()}`, { cache: "no-store" });
      const data: TalksResponse = await res.json();
      setItems(prev => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch {
      setError("Failed to load more talks");
    } finally {
      setLoading(false);
    }
  }

  async function onSelect(item: TalkItem) {
    setSelected(item);
    const key = item.key || item.id;
    const href = `/talks/watch/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
    if (typeof window !== "undefined") {
      window.location.href = href;
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-4 text-gray-900">Talks</h1>
      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}
      {items.length === 0 && loading ? (
        <div className="py-16 flex justify-center">
          <Spinner label="Loading talks" />
        </div>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 border rounded-lg overflow-hidden">
          <ul className="divide-y">
            {items.map((it) => {
              const key = it.key || it.id;
              const href = `/talks/watch/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
              return (
                <li
                  key={it.id}
                  className={`px-4 py-3 hover:bg-gray-100 ${selected?.id === it.id ? "bg-gray-200" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="min-w-0 no-underline flex items-center gap-3 cursor-pointer"
                      role="link"
                      tabIndex={0}
                      onClick={()=>onSelect(it)}
                      onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(it); } }}
                    >
                      <div className="h-14 w-14 rounded overflow-hidden bg-gray-200 flex items-center justify-center shrink-0">
                        {it.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover" onError={(e)=>{ (e.currentTarget as HTMLImageElement).style.display='none'; }} />
                        ) : (
                          <div className="text-gray-700">
                            {it.type === "video" ? (
                              <VideoIcon className="h-6 w-6" />
                            ) : (
                              <Music className="h-6 w-6" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-800">
                            {it.type === "video" ? (
                              <VideoIcon className="h-4 w-4" />
                            ) : (
                              <Music className="h-4 w-4" />
                            )}
                          </span>
                          <div className="truncate font-medium text-gray-900">{it.title}</div>
                        </div>
                        <div className="text-xs text-gray-700 mt-0.5 truncate">
                          {it.speaker ? `by ${it.speaker}` : null}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {(() => { const d = it.date ? new Date(it.date) : new Date(it.createdAt); const dd = String(d.getDate()).padStart(2, '0'); const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; const yyyy = d.getFullYear(); return `${dd} ${mon} ${yyyy}`; })()}
                        </div>
                      </div>
                    </div>
                    <Button asChild size="sm" className="shrink-0">
                      <a href={href}>Watch</a>
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="p-3">
            <Button
              className="w-full"
              onClick={loadMore}
              disabled={!hasMore || loading}
            >
              {loading ? <Spinner label="Loading more" size={20} ringWidth={3} className="py-1" /> : hasMore ? "Load more" : "No more"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}