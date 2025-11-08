'use client';

import AuthGuard from '@/app/components/Auth/AuthGuard';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EventItem } from '@/app/types/event';
import Spinner from '@/app/components/Spinner';

export default function AdminEventsListPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/events', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load');
        setItems((json.items as EventItem[]) || []);
      } catch (e: any) {
        setError(e?.message || 'Error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <Link href="/admin/events/create" className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black">New event</Link>
        </div>
        {loading ? (
          <div className="py-10 flex items-center justify-center"><Spinner label="Loading events…" /></div>
        ) : error ? (
          <div className="text-red-700">{error}</div>
        ) : (
          <div className="space-y-2">
            {items.map(ev => (
              <div key={ev.id} className="rounded-md border border-gray-200 bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{ev.title}</div>
                  <div className="text-sm text-gray-900">{ev.date ? new Date(ev.date).toDateString() : ''}{ev.location ? ` · ${ev.location}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/events/${encodeURIComponent(ev.slug)}`} className="text-sm text-gray-900 underline hover:text-black">View</Link>
                  <Link href={`/admin/events/${encodeURIComponent(ev.id)}/edit`} className="text-sm text-gray-900 underline hover:text-black">Edit</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
