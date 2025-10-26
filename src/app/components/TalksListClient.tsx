"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { Key: string; Size: number; LastModified?: string };

type ApiResponse = {
  items: Item[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
};

export default function TalksListClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = useMemo(() => Boolean(token), [token]);

  async function fetchPage(continuationToken?: string | null) {
    const qs = new URLSearchParams();
    if (continuationToken) qs.set("continuationToken", continuationToken);
    const res = await fetch(`/api/talks/list${qs.size ? `?${qs}` : ""}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data: ApiResponse = await res.json();
    return data;
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchPage();
        if (ignore) return;
        setItems(data.items);
        setToken(data.nextContinuationToken);
      } catch (e: any) {
        if (!ignore) setError(e?.message || "Failed to load");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function loadMore() {
    if (!token || loading) return;
    try {
      setLoading(true);
      const data = await fetchPage(token);
      setItems(prev => [...prev, ...data.items]);
      setToken(data.nextContinuationToken);
    } catch (e: any) {
      setError(e?.message || "Failed to load more");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-2xl font-semibold mb-4">Talks</h1>
      {error && <div className="mb-3 text-sm text-red-700">{error}</div>}
      <ul className="divide-y rounded border">
        {items.map((it) => {
          const key = it.Key;
          const name = key.split("/").pop() || key;
          return (
            <li key={key} className="px-4 py-3 flex items-center justify-between">
              <a className="text-blue-700 hover:underline truncate" href={`/cgstalk?key=${encodeURIComponent(key)}`}>
                {name}
              </a>
              <span className="text-xs text-gray-600">{it.Size} bytes</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-4">
        <button
          className="rounded border px-3 py-2 text-sm hover:bg-gray-100 disabled:opacity-50"
          disabled={!hasMore || loading}
          onClick={loadMore}
        >
          {loading ? "Loading..." : hasMore ? "Load more" : "No more"}
        </button>
      </div>
    </div>
  );
}
