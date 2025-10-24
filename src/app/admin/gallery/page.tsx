'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import type { GalleryItem } from '@/app/types/gallery';

export default function AdminGalleryUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<'auto'|'image'|'video'>('auto');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [lastError, setLastError] = useState<string|undefined>();
  const [statuses, setStatuses] = useState<Record<string, 'queued'|'uploading'|'saved'|'error'>>({});
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  const slugify = (v: string) => v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const onCategoryChange = (v: string) => {
    setCategory(v);
  };
  const onCategoryBlur = (v: string) => {
    setCategory(slugify(v));
  };

  const categoryPreview = useMemo(() => slugify(category || ''), [category]);

  const loadItems = async () => {
    const res = await fetch('/api/gallery?limit=1000', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
      setSelected(new Set());
      const cats = Array.from(new Set((data.items || []).map((i: GalleryItem) => (i.categoryLabel || i.category)).filter(Boolean)));
      cats.sort();
      setExistingCategories(cats as string[]);
    }
  };

  useEffect(() => { void loadItems(); }, []);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    const ids = Array.from(selected);
    const res = await fetch('/api/gallery/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
    if (res.ok) {
      await loadItems();
    }
  };

  const deleteOne = async (id: string) => {
    const res = await fetch('/api/gallery/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    if (res.ok) {
      await loadItems();
    }
  };

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setStatuses(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(undefined);
    setLastError(undefined);

    try {
      const categoryLabel = category;
      const categorySlug = slugify(categoryLabel);
      if (categorySlug !== category) setCategory(categorySlug);
      // If video URL is provided, treat as single item regardless of files
      if (videoUrl.trim()) {
        const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : Math.random().toString(36).slice(2));

        const single: GalleryItem = {
          id,
          type: 'video',
          title: title || undefined,
          caption: caption || undefined,
          url: videoUrl.trim(),
          thumbnailUrl: thumbUrl || undefined,
          category: categorySlug,
          categoryLabel,
          createdAt: new Date().toISOString(),
        };
        const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(single) });
        if (!res.ok) throw new Error('Failed to save metadata');
        setMessage('Video saved');
        setTitle(''); setCaption(''); setVideoUrl(''); setThumbUrl(''); setFiles([]); setStatuses({});
        setLoading(false);
        void loadItems();
        return;
      }

      if (!files.length) throw new Error('Select one or more files to upload');

      // Bulk upload flow for selected files -> then one metadata save
      const newStatuses: Record<string, 'queued'|'uploading'|'saved'|'error'> = {};
      files.forEach(f => { newStatuses[f.name] = 'queued'; });
      setStatuses(newStatuses);

      const created: GalleryItem[] = [];
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (f) => {
          try {
            setStatuses(prev => ({ ...prev, [f.name]: 'uploading' }));
            const fileType: 'image'|'video' = f.type.startsWith('video/') ? 'video' : 'image';
            const ps = await fetch('/api/gallery/presign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: fileType, category: categorySlug, filename: f.name, contentType: f.type })
            });
            const p = await ps.json().catch(() => ({}));
            if (!ps.ok) {
              const errMsg = (p && p.error) ? String(p.error) : `Presign failed (${ps.status})`;
              setLastError(errMsg);
              throw new Error(errMsg);
            }
            const put = await fetch(p.url as string, { method: 'PUT', body: f, headers: { 'Content-Type': f.type || 'application/octet-stream' } });
            if (!put.ok) {
              const errBody = await put.text().catch(()=> '');
              const errMsg = `Upload failed (${put.status}) ${errBody}`.trim();
              setLastError(errMsg);
              throw new Error(errMsg);
            }

            const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto
              ? globalThis.crypto.randomUUID()
              : Math.random().toString(36).slice(2));

            created.push({
              id,
              type: fileType,
              title: title || undefined,
              caption: caption || undefined,
              url: p.publicUrl as string,
              key: p.key as string,
              thumbnailUrl: fileType === 'video' ? (thumbUrl || undefined) : undefined,
              category: categorySlug,
              categoryLabel,
              createdAt: new Date().toISOString(),
            });
            setStatuses(prev => ({ ...prev, [f.name]: 'saved' }));
          } catch (err: any) {
            setStatuses(prev => ({ ...prev, [f.name]: 'error' }));
            if (err?.message) setLastError(err.message);
          }
        }));
      }

      if (created.length) {
        const res = await fetch('/api/gallery/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: created }) });
        if (!res.ok) throw new Error('Failed to save gallery metadata');
      }

      if (created.length === 0) {
        setMessage(`Bulk upload complete (0 saved)${lastError ? ` — ${lastError}` : ''}`);
      } else {
        setMessage(`Bulk upload complete (${created.length} saved)`);
      }
      setFiles([]); setTitle(''); setCaption(''); setThumbUrl('');
      void loadItems();
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="border-b border-gray-200 rounded-t-xl p-6">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gallery Uploads</h1>
              <p className="text-sm text-gray-600 mt-1">Upload images or videos and tag them by event.</p>
            </div>

            <form onSubmit={onSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Type</label>
                  <select value={type} onChange={(e)=>setType(e.target.value as any)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white">
                    <option value="auto">Auto (mixed)</option>
                    <option value="image">Image only</option>
                    <option value="video">Video only</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900">Category / Event</label>
                  <input list="existing-categories" value={category} onChange={(e)=>onCategoryChange(e.target.value)} onBlur={(e)=>onCategoryBlur(e.target.value)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="e.g. retreat-2025" />
                  <datalist id="existing-categories">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <div className="mt-1 text-xs text-gray-500">Pick an existing event from the list or type a new one. We’ll auto-slugify it.</div>
                  <div className="mt-1 text-xs text-gray-500">Will save as: <span className="font-mono text-gray-900">{categoryPreview || '—'}</span></div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-white/50">
                <div className="mb-3 text-sm font-medium text-gray-700">Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Title</label>
                    <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Caption</label>
                    <input value={caption} onChange={(e)=>setCaption(e.target.value)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white" />
                  </div>
                </div>
              </div>

              {type === 'video' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-900">Video URL (YouTube/Vimeo or direct)</label>
                  <input value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="https://youtu.be/..." />
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-gray-900">{type==='image'? 'Image Files': type==='video' ? 'Video Files' : 'Image or Video Files'} (drag & drop or select multiple)</label>
                <div
                  onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragEnter={(e)=>{ e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
                  onDragLeave={(e)=>{ e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
                  onDrop={(e)=>{ e.preventDefault(); e.stopPropagation(); setDragActive(false); const dropped = Array.from(e.dataTransfer.files || []); const accepted = dropped.filter(f=> type==='image'? f.type.startsWith('image/') : type==='video'? f.type.startsWith('video/') : (f.type.startsWith('image/') || f.type.startsWith('video/'))); setFiles(prev=>[...prev, ...accepted]); }}
                  className={`mt-2 rounded-md border-2 ${dragActive? 'border-sky-500 bg-sky-50':'border-dashed border-gray-300 bg-gray-50'} p-6 text-center text-gray-900`}
                >
                  <div className="mb-3 font-medium">Drop files here</div>
                  <div className="text-sm text-gray-600">or</div>
                  <div className="mt-3">
                    <label className="inline-block cursor-pointer px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-black">
                      Browse files
                      <input
                        type="file"
                        multiple
                        accept={type==='image'? 'image/*': type==='video' ? 'video/*' : 'image/*,video/*'}
                        onChange={(e)=>setFiles(prev=>[...prev, ...Array.from(e.target.files || [])])}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {!!files.length && (
                  <div className="mt-4">
                    <div className="mb-2 text-sm text-gray-700">{files.length} file(s) selected <button type="button" onClick={()=>setFiles([])} className="ml-2 underline">Clear</button></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {files.map((f) => (
                        <div key={f.name} className="relative rounded-md border border-gray-200 bg-gray-50 p-2">
                          <button type="button" onClick={() => removeFile(f.name)} className="absolute right-1 top-1 inline-flex items-center justify-center rounded text-xs px-2 py-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100">Remove</button>
                          {f.type.startsWith('image/') ? (
                            <img src={URL.createObjectURL(f)} alt={f.name} className="h-24 w-full object-cover rounded-lg" />
                          ) : (
                            <div className="h-24 w-full flex items-center justify-center text-xs text-gray-900 bg-white rounded">
                              {f.name}
                            </div>
                          )}
                          <div className="mt-2 text-xs flex items-center justify-between">
                            <span className="truncate max-w-[8rem]" title={f.name}>{f.name}</span>
                            <span className="font-medium">
                              {statuses[f.name] === 'uploading' && <span className="text-gray-700">Uploading…</span>}
                              {statuses[f.name] === 'saved' && <span className="text-green-700">Saved</span>}
                              {statuses[f.name] === 'error' && <span className="text-red-700">Error</span>}
                              {!statuses[f.name] && <span className="text-gray-500">Queued</span>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Thumbnail URL (for videos)</label>
                <input value={thumbUrl} onChange={(e)=>setThumbUrl(e.target.value)} className="mt-1 w-full border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="https://.../thumb.jpg" />
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={loading} className="px-5 py-3 rounded-md bg-gray-900 text-white hover:bg-black disabled:opacity-50 shadow">
                  {loading? 'Working…':'Save to Gallery'}
                </button>
                {message ? <div className="text-sm text-gray-700">{message}</div> : null}
              </div>
            </form>
          </div>

          
        </div>
      </div>
    </AuthGuard>
  );
}
