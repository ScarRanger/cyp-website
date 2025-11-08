"use client";

import { useEffect, useState } from "react";
import type { EventItem } from "@/app/types/event";
import Link from "next/link";
import Spinner from "@/app/components/Spinner";

export default function EventsPage() {
	const [events, setEvents] = useState<EventItem[]>([]);
	const [randomThumbs, setRandomThumbs] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		(async () => {
			try {
				setLoading(true);
				const res = await fetch("/api/events", { cache: "no-store" });
				const data = await res.json();
				if (!res.ok) throw new Error(data?.error || "Failed to load events");
				setEvents((data.items as EventItem[]) || []);
			} catch (e: any) {
				setError(e?.message || "Failed to load events");
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// Fetch a random gallery image for each event lacking a headerImageUrl
	useEffect(() => {
		if (events.length === 0) return;
		const neededCategories = new Set<string>();
		for (const ev of events) {
			if (!ev.headerImageUrl && ev.galleryCategory && !randomThumbs[ev.galleryCategory]) {
				neededCategories.add(ev.galleryCategory);
			}
		}
		if (neededCategories.size === 0) return;
		(async () => {
			const updates: Record<string, string> = {};
			await Promise.all(Array.from(neededCategories).map(async (cat) => {
				try {
					// Fetch up to 50 items to get variety; then pick one randomly
					const params = new URLSearchParams();
					params.set('category', cat);
					params.set('limit', '50');
					const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
					if (!res.ok) return;
					const data = await res.json();
					const items = (data.items as any[]) || [];
					if (items.length === 0) return;
					// Prefer true images; if none, only use videos that have a thumbnailUrl
					const imageItems = items.filter((it) => it?.type === 'image' && (it.thumbnailUrl || it.url));
					const videoThumbs = items.filter((it) => it?.type === 'video' && it.thumbnailUrl);
					const pool = imageItems.length > 0 ? imageItems : videoThumbs;
					if (pool.length === 0) return; // nothing we can safely show as an <img>
					const pick = pool[Math.floor(Math.random() * pool.length)];
					updates[cat] = pick.thumbnailUrl || pick.url;
				} catch {
					// ignore per-category errors
				}
			}));
			if (Object.keys(updates).length > 0) {
				setRandomThumbs(prev => ({ ...prev, ...updates }));
			}
		})();
	}, [events, randomThumbs]);

	if (loading) return (
		<div className="max-w-6xl mx-auto p-10 flex items-center justify-center">
			<Spinner label="Loading events…" />
		</div>
	);
	if (error) return <div className="max-w-6xl mx-auto p-6 text-red-700">{error}</div>;

	return (
		<div className="max-w-6xl mx-auto p-6">
			<h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 mb-4">Events</h1>
			{events.length === 0 ? (
				<div className="text-gray-600">No events yet.</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{events.map((ev) => (
						<Link
							key={ev.id}
							href={`/events/${encodeURIComponent(ev.slug)}`}
							className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition"
						>
							<div className="aspect-[4/3] w-full bg-gray-100 overflow-hidden">
								{(() => {
									const imgSrc = ev.headerImageUrl || (ev.galleryCategory ? randomThumbs[ev.galleryCategory] : undefined);
									if (!imgSrc) {
										return <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>;
									}
									return (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={imgSrc}
											alt={ev.title}
											className="h-full w-full object-cover group-hover:scale-[1.02] transition"
											onError={(e)=>{ const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23f3f4f6"/></svg>'; }}
										/>
									);
								})()}
							</div>
							<div className="p-4">
								<div className="text-gray-900 font-medium truncate">{ev.title}</div>
								<div className="mt-1 text-sm text-gray-700 truncate">{ev.location || ""}</div>
								<div className="mt-1 text-xs text-gray-600">{ev.date ? new Date(ev.date).toDateString() : ''}</div>
								<p className="mt-2 text-sm text-gray-700 line-clamp-3">{ev.shortDescription || ''}</p>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

