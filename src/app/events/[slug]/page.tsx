"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import GallerySection from '@/app/components/Gallery/GallerySection';
import type { EventItem } from "@/app/types/event";
import Spinner from "@/app/components/Spinner";

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const [event, setEvent] = useState<EventItem | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/events?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load event");
        const ev: EventItem | undefined = (data.items && data.items[0]) || undefined;
        setEvent(ev);
      } catch (e: any) {
        setError(e?.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return (
    <div className="max-w-5xl mx-auto p-10 flex items-center justify-center">
      <Spinner label="Loading event…" />
    </div>
  );
  if (error) return <div className="max-w-5xl mx-auto p-6 text-red-700">{error}</div>;
  if (!event) return <div className="max-w-5xl mx-auto p-6">Event not found.</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-4">
        <Link href="/events" className="text-sm text-gray-600 hover:text-gray-900 underline">Back to events</Link>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {event.headerImageUrl && (
          <div className="w-full aspect-[16/9] bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.headerImageUrl} alt={event.title} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900">{event.title}</h1>
          <div className="mt-2 text-gray-700">
            {event.date ? new Date(event.date).toDateString() : ''}{event.location ? ` · ${event.location}` : ''}
          </div>
          {event.shortDescription && (
            <p className="mt-3 text-gray-800">{event.shortDescription}</p>
          )}
          {event.longDescription && (
            <div className="mt-6 max-w-none text-gray-900">
              <p className="whitespace-pre-wrap leading-relaxed">{event.longDescription}</p>
            </div>
          )}
        </div>
      </div>
      {event.galleryCategory && (
        <div className="mt-10">
          <GallerySection category={event.galleryCategory} heading="Photos & Videos" showViewFullLink={false} />
        </div>
      )}
    </div>
  );
}
