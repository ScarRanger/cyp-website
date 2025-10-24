'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type { GalleryItem } from '@/app/types/gallery';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="absolute inset-0 opacity-30 blur-3xl bg-[radial-gradient(circle_at_20%_20%,#fde68a,transparent_40%),radial-gradient(circle_at_80%_30%,#fca5a5,transparent_40%),radial-gradient(circle_at_50%_80%,#a7f3d0,transparent_40%)]" />
      <div className="container mx-auto px-4 py-20 relative">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">Moments of faith, fellowship, and fun</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-700">Captured from our retreats, outreaches, and youth gatherings. Bright, warm, and full of joy and unity.</p>
        <div className="mt-6">
          <a href="#gallery" className="inline-flex items-center px-5 py-3 rounded-xl bg-gray-900 text-white hover:bg-black transition">Explore Gallery</a>
        </div>
      </div>
    </section>
  );
}

type CategoryTab = { slug: string; label: string };

function Tabs({ categories, active, onChange }: { categories: CategoryTab[]; active: string; onChange: (c: string) => void; }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-2">
        <button key="all" onClick={() => onChange('all')} className={`px-4 py-2 rounded-full border text-sm transition ${active==='all'? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>All</button>
        {categories.map(cat => (
          <button key={cat.slug} onClick={() => onChange(cat.slug)} className={`px-4 py-2 rounded-full border text-sm transition ${active===cat.slug? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>{cat.label}</button>
        ))}
      </div>
    </div>
  );
}

function useGallery(category: string) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string|undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const load = async (reset=false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    params.set('limit', '12');
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    setItems(prev => reset ? data.items : [...prev, ...data.items]);
    setCursor(data.nextCursor);
    setLoading(false);
  };

  useEffect(() => { setItems([]); setCursor(undefined); void load(true); }, [category]);

  return { items, cursor, loading, load };
}

function Masonry({ items, onOpen }: { items: GalleryItem[]; onOpen: (i: number)=>void; }) {
  return (
    <div id="gallery" className="container mx-auto px-4">
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
        {items.map((it, idx) => (
          <div key={it.id} className="mb-4 break-inside-avoid cursor-pointer group" onClick={() => onOpen(idx)}>
            {it.type === 'image' ? (
              <img src={it.thumbnailUrl || it.url} alt={it.caption || it.title || 'image'} className="w-full h-auto rounded-xl object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
            ) : (
              <div className="relative w-full overflow-hidden rounded-xl bg-black/80">
                {it.thumbnailUrl ? (
                  <img src={it.thumbnailUrl} alt={it.caption || it.title || 'video'} className="w-full h-auto object-cover opacity-90" loading="lazy" />
                ) : (
                  <div className="aspect-video" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow">
                    <div className="ml-1 w-0 h-0 border-t-8 border-b-8 border-l-0 border-r-0 border-transparent" style={{ borderLeft: '14px solid black' }} />
                  </div>
                </div>
              </div>
            )}
            {it.caption ? <div className="mt-2 text-sm text-gray-600">{it.caption}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Lightbox({ open, items, index, onClose }: { open: boolean; items: GalleryItem[]; index: number; onClose: ()=>void; }) {
  const item = items[index];
  if (!open || !item) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-5xl w-full" onClick={(e)=>e.stopPropagation()}>
        {item.type === 'image' ? (
          <img src={item.url} alt={item.caption || item.title || ''} className="w-full h-auto rounded-lg" />
        ) : (
          item.url.includes('youtube.com') || item.url.includes('youtu.be') || item.url.includes('vimeo.com') ? (
            <div className="aspect-video w-full">
              <iframe className="w-full h-full rounded-lg" src={item.url.replace('watch?v=', 'embed/')} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <video controls className="w-full h-auto rounded-lg" src={item.url} />
          )
        )}
        {item.caption ? <div className="mt-3 text-white/80">{item.caption}</div> : null}
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [category, setCategory] = useState('all');
  const { items, cursor, loading, load } = useGallery(category);
  const cats = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of items) {
      if (it.category) {
        const slug = it.category;
        const label = it.categoryLabel || it.category;
        if (!map.has(slug)) map.set(slug, label);
      }
    }
    return Array.from(map.entries()).map(([slug, label]) => ({ slug, label }));
  }, [items]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const openAt = (i: number) => { setIndex(i); setOpen(true); };

  return (
    <div>
      <Hero />
      <Tabs categories={cats} active={category} onChange={setCategory} />
      <Masonry items={items} onOpen={openAt} />
      <div className="container mx-auto px-4 py-8 flex justify-center">
        {cursor ? (
          <button onClick={() => load(false)} className="px-5 py-3 rounded-xl bg-gray-900 text-white disabled:opacity-50" disabled={loading}>{loading? 'Loading...':'Load more'}</button>
        ) : (
          <div className="text-gray-500">{loading? 'Loading...':'No more items'}</div>
        )}
      </div>
      <Lightbox open={open} items={items} index={index} onClose={()=>setOpen(false)} />
    </div>
  );
}
