'use client';

import React, { useEffect, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import NoDownload from "../components/NoDownload";

type Item = { Key: string; Size: number; LastModified?: string };

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/cgstalk/list', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load talks');
        const data = (await res.json()) as { items: Item[] };
        const sorted = [...data.items]
          .sort((a, b) => {
            const ad = a.LastModified ? new Date(a.LastModified).getTime() : 0;
            const bd = b.LastModified ? new Date(b.LastModified).getTime() : 0;
            return bd - ad;
          })
          .filter((it) => !it.Key.endsWith('/'));
        if (!cancelled) setItems(sorted);
      } catch (e) {
        if (!cancelled) setError('Failed to load talks.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthGuard>
      <NoDownload>
        <main className="mx-auto max-w-4xl p-4">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">CGS Talks</h1>
          </div>

          {loading && (
            <div className="text-sm text-slate-700">Loading...</div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && (
            <ul className="divide-y rounded-lg border bg-white shadow-sm">
              {items.map((it) => {
                const key = it.Key;
                const name = key.split("/").pop() || key;
                const href = `/cgstalk/watch/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
                const when = it.LastModified ? new Date(it.LastModified).toLocaleString() : "";
                return (
                  <li key={key} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <a className="min-w-0 no-underline" href={href}>
                        <div className="truncate text-slate-900 font-medium">{name}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{when}</div>
                      </a>
                      <a
                        href={href}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-400 ring-offset-white h-9 px-3 text-sm"
                      >
                        Watch
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </NoDownload>
    </AuthGuard>
  );
}
