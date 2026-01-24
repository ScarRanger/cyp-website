'use client';

import React, { useEffect, useState } from 'react';
import AuthGuard from "@/app/components/Auth/AuthGuard";
import NoDownload from "../components/NoDownload";
import Spinner from "../components/Spinner";
import { Button } from "../components/ui/button";

// Warm Espresso Theme Colors
const theme = {
  background: '#1C1917',
  surface: '#1C1917',
  primary: '#FB923C',
  text: '#FAFAFA',
  border: '#FB923C30',
};

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd} ${mon} ${yyyy}`;
  };

  return (
    <AuthGuard>
      <NoDownload>
        <div className="min-h-screen p-4 md:p-6" style={{ backgroundColor: theme.background }}>
          <main className="mx-auto max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>CGS Talks</h1>
            </div>

            {loading && (
              <div className="py-16 flex justify-center">
                <Spinner
                  label="Loading talks"
                  trackClassName="border-white/20"
                  ringClassName="border-t-[#FB923C]"
                  labelClassName="text-[#FAFAFA]"
                />
              </div>
            )}

            {error && !loading && (
              <div className="mb-4 rounded border border-red-400 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <ul className="divide-y" style={{ borderColor: theme.border }}>
                  {items.map((it) => {
                    const key = it.Key;
                    const name = key.split("/").pop() || key;
                    const displayName = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
                    const href = `/cgstalk/watch/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
                    const when = formatDate(it.LastModified);

                    return (
                      <li
                        key={key}
                        className="px-4 py-4 transition-colors hover:bg-white/5"
                        style={{ borderColor: theme.border }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <a
                            className="min-w-0 no-underline flex-1 cursor-pointer"
                            href={href}
                          >
                            <div className="truncate font-semibold text-lg" style={{ color: theme.text }}>
                              {displayName || name}
                            </div>
                            <div className="text-sm mt-1 opacity-70" style={{ color: theme.text }}>
                              {when}
                            </div>
                          </a>
                          <Button asChild size="sm" className="shrink-0 font-medium" style={{ backgroundColor: theme.primary, color: '#1C1917' }}>
                            <a href={href}>Watch</a>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </main>
        </div>
      </NoDownload>
    </AuthGuard>
  );
}
