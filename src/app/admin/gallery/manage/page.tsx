'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import type { GalleryItem } from '@/app/types/gallery';

export default function ManageGalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  const load = async (reset = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '30');
    if (category && category !== 'all') params.set('category', category);
    if (!reset && cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
    const data = await res.json();
    setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
    setCursor(data.nextCursor);
    setLoading(false);
  };

  useEffect(() => { setItems([]); setCursor(undefined); void load(true); }, [category]);

  const categories = useMemo(() => {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (
      (i.title || '').toLowerCase().includes(q) ||
      (i.caption || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.categoryLabel || '').toLowerCase().includes(q)
    ));
  }, [items, query]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((i) => i.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const deleteSelected = async () => {
    if (!selected.size) return;
    const confirmMsg = `Delete ${selected.size} selected item(s)? This cannot be undone.`;
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return;
    const ids = Array.from(selected);
    const res = await fetch('/api/gallery/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    if (res.ok) {
      // Remove from local state without a reload
      const remaining = items.filter((i) => !selected.has(i.id));
      setItems(remaining);
      setSelected(new Set());
    }
  };

  const deleteOne = async (id: string) => {
    const it = items.find(x => x.id === id);
    const label = it?.title || it?.caption || it?.categoryLabel || it?.category || id;
    const confirmMsg = `Delete this item: "${label}"?`;
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return;
    const res = await fetch('/api/gallery/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm text-gray-900">
            <div className="p-4 border-b border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h1 className="text-xl font-semibold text-gray-900">Manage Gallery</h1>
              <div className="flex flex-wrap gap-2 items-center">
                <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search title/caption/category" className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 placeholder:text-gray-500 bg-white" />
                <select value={category} onChange={(e)=>setCategory(e.target.value)} className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white">
                  <option value="all">All</option>
                  {categories.map((c) => (<option key={c.slug} value={c.slug}>{c.label}</option>))}
                </select>
                <button onClick={selectAllFiltered} className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white hover:bg-gray-50">Select all</button>
                <button onClick={clearSelection} className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-900 bg-white hover:bg-gray-50">Clear</button>
                <button onClick={deleteSelected} disabled={!selected.size} className="px-3 py-2 rounded-md bg-red-600 text-white text-sm disabled:opacity-50">Delete selected</button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filtered.map((it) => (
                <div key={it.id} className="grid grid-cols-[32px_64px_1fr_120px_80px] items-center gap-3 px-4 py-2">
                  <div>
                    <input type="checkbox" checked={selected.has(it.id)} onChange={()=>toggleSelect(it.id)} />
                  </div>
                  <div className="w-16 h-12 bg-gray-100 overflow-hidden rounded">
                    {it.type === 'image' ? (
                      <img src={it.thumbnailUrl || it.url} alt={it.title || ''} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-600">Video</div>
                    )}
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-medium text-gray-900 truncate">{it.title || it.caption || it.id}</div>
                    <div className="text-xs text-gray-500 truncate">{it.categoryLabel || it.category || ''}</div>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{new Date(it.createdAt).toLocaleString()}</div>
                  <div className="text-right">
                    <button onClick={()=>deleteOne(it.id)} className="px-2 py-1 rounded border border-gray-300 text-sm text-gray-900 bg-white hover:bg-gray-50">Delete</button>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <div className="p-6 text-sm text-gray-700">No items match.</div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              {cursor ? (
                <button disabled={loading} onClick={()=>load(false)} className="px-4 py-2 rounded-md bg-gray-900 text-white disabled:opacity-50">
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              ) : (
                <span className="text-sm text-gray-500">End of list</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
