'use client';

import React, { useEffect, useMemo, useState } from 'react';
import AuthGuard from '@/app/components/Auth/AuthGuard';
import type { GalleryItem } from '@/app/types/gallery';
import type { EventItem } from '@/app/types/event';

export default function AdminGalleryUploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<'auto'|'image'|'video'>('auto');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('general');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbUrl, setThumbUrl] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string|undefined>();
  const [lastError, setLastError] = useState<string|undefined>();
  const [statuses, setStatuses] = useState<Record<string, 'queued'|'uploading'|'saved'|'error'>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dragActive, setDragActive] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [catOpen, setCatOpen] = useState(false);

  const slugify = (v: string) => v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const onCategoryChange = (v: string) => {
    setCategory(v);
    setCategoryQuery(v);
  };
  const onCategoryBlur = (v: string) => {
    setCategory(slugify(v));
  };

  const categoryPreview = useMemo(() => slugify(category || ''), [category]);
  const filteredCategories = useMemo(() => {
    const q = (categoryQuery || '').toLowerCase();
    // Combine existing categories and events
    const allOptions = [
      ...existingCategories.map(c => ({ value: c, label: c, type: 'category' as const })),
      ...events.map(ev => ({ value: slugify(ev.title), label: `${ev.title} (Event)`, type: 'event' as const, eventId: ev.id }))
    ];
    const list = allOptions.filter(opt => !q || opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q));
    return list.slice(0, 50);
  }, [existingCategories, events, categoryQuery]);

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
    // Load events for dropdown
    try {
      const evRes = await fetch('/api/events?limit=1000', { cache: 'no-store' });
      const evJson = await evRes.json();
      if (evRes.ok) setEvents((evJson.items as EventItem[]) || []);
    } catch {}
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
    const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids }) });
    if (res.ok) {
      await loadItems();
    }
  };

  const deleteOne = async (id: string) => {
    const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids: [id] }) });
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

  const singlePutUpload = async (
    { file, fileType, categorySlug, categoryLabel, contentType, year, eventId }: { file: File; fileType: 'image'|'video'; categorySlug: string; categoryLabel: string; contentType: string; year: number; eventId?: string },
    onProgress: (pct: number) => void
  ): Promise<GalleryItem> => {
    const ps = await fetch('/api/gallery/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: fileType, category: categorySlug, filename: file.name, contentType, year })
    });
    const p = await ps.json().catch(() => ({}));
    if (!ps.ok) {
      const errMsg = (p && p.error) ? String(p.error) : `Presign failed (${ps.status})`;
      throw new Error(errMsg);
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', p.url as string);
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.min(100, (e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (${xhr.status})`));
      };
      xhr.send(file);
    });

    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2));

    return {
      id,
      type: fileType,
      title: title || undefined,
      caption: caption || undefined,
      url: p.publicUrl as string,
      key: p.key as string,
      thumbnailUrl: fileType === 'video' ? (thumbUrl || undefined) : undefined,
      category: categorySlug,
      categoryLabel,
      eventId: eventId,
      year: year,
      createdAt: new Date().toISOString(),
    } as GalleryItem;
  };

  const multipartUpload = async (
    { file, fileType, categorySlug, categoryLabel, contentType, year, eventId }: { file: File; fileType: 'image'|'video'; categorySlug: string; categoryLabel: string; contentType: string; year: number; eventId?: string },
    onProgress: (pct: number) => void
  ): Promise<GalleryItem> => {
    const createRes = await fetch('/api/gallery/multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', type: fileType, category: categorySlug, filename: file.name, contentType, year })
    });
    const created = await createRes.json().catch(()=> ({}));
    if (!createRes.ok) throw new Error(created?.error || 'Failed to init multipart');
    const { uploadId, key, publicUrl } = created as { uploadId: string; key: string; publicUrl: string };

    const PART_SIZE = 10 * 1024 * 1024;
    const totalParts = Math.ceil(file.size / PART_SIZE);
    const partNumbers = Array.from({ length: totalParts }, (_, i) => i + 1);

    // Request presigned part URLs in batches to avoid long serverless executions
    const MAX_PER_REQ = 100;
    const urlsJson = { urls: {} as Record<number, string> };
    for (let i = 0; i < partNumbers.length; i += MAX_PER_REQ) {
      const chunk = partNumbers.slice(i, i + MAX_PER_REQ);
      const urlsRes = await fetch('/api/gallery/multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parts', key, uploadId, partNumbers: chunk, contentType })
      });
      const chunkJson = await urlsRes.json().catch(()=> ({}));
      if (!urlsRes.ok) throw new Error(chunkJson?.error || 'Failed to sign parts');
      Object.assign(urlsJson.urls, chunkJson.urls || {});
    }

    let uploadedBytes = 0;
    const perPartLoaded: Record<number, number> = {};
    const partsOut: Array<{ PartNumber: number; ETag: string }> = [];

    const uploadPartWithRetry = async (partNumber: number): Promise<void> => {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);
      const url: string = (urlsJson.urls as Record<number, string>)[partNumber];

      let attempt = 0;
      const maxAttempts = 4;
      while (attempt < maxAttempts) {
        try {
          const etag = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', url);
            xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const loaded = e.loaded;
                const prev = perPartLoaded[partNumber] || 0;
                perPartLoaded[partNumber] = loaded;
                uploadedBytes += Math.max(0, loaded - prev);
                const pct = Math.min(100, (uploadedBytes / file.size) * 100);
                onProgress(pct);
              }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                const et = xhr.getResponseHeader('ETag') || '';
                // Reconcile any missing bytes if final progress event didn't report full blob size
                const finalLoaded = perPartLoaded[partNumber] || 0;
                if (finalLoaded < blob.size) {
                  uploadedBytes += (blob.size - finalLoaded);
                  perPartLoaded[partNumber] = blob.size;
                  const pct = Math.min(100, (uploadedBytes / file.size) * 100);
                  onProgress(pct);
                }
                resolve(et);
              } else {
                reject(new Error(`Part ${partNumber} failed (${xhr.status})`));
              }
            };
            xhr.send(blob);
          });
          partsOut.push({ PartNumber: partNumber, ETag: etag });
          return;
        } catch (err) {
          attempt += 1;
          if (attempt >= maxAttempts) throw err;
          const backoff = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
    };

    const concurrency = 4;
    let idx = 0;
    const runners = Array.from({ length: Math.min(concurrency, totalParts) }, async () => {
      while (true) {
        const current = idx < totalParts ? partNumbers[idx++] : undefined;
        if (current === undefined) break;
        await uploadPartWithRetry(current);
      }
    });
    await Promise.all(runners);
    // Ensure we report 100% before completing
    onProgress(100);

    const completeRes = await fetch('/api/gallery/multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId, parts: partsOut })
    });
    const completed = await completeRes.json().catch(()=> ({}));
    if (!completeRes.ok) {
      await fetch('/api/gallery/multipart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'abort', key, uploadId }) }).catch(()=>{});
      throw new Error(completed?.error || 'Failed to complete upload');
    }

    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : Math.random().toString(36).slice(2));

    return {
      id,
      type: fileType,
      title: title || undefined,
      caption: caption || undefined,
      url: publicUrl,
      key,
      thumbnailUrl: fileType === 'video' ? (thumbUrl || undefined) : undefined,
      category: categorySlug,
      categoryLabel,
      eventId: eventId,
      year: year,
      createdAt: new Date().toISOString(),
    } as GalleryItem;
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
      
      // Validate category is not a year
      if (!categorySlug || /^\d{4}$/.test(categorySlug)) {
        throw new Error('Category is required and cannot be a year value (e.g., 2025). Please enter a descriptive category.');
      }
      
      // Parse year from input
      const yStr = (year || '').trim();
      const yearNum = yStr ? (parseInt(yStr, 10) || new Date().getFullYear()) : new Date().getFullYear();
      
      // Check if category matches an event
      const matchedEvent = events.find(ev => slugify(ev.title) === categorySlug);
      const eventId = matchedEvent?.id || undefined;
      
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
          eventId: eventId,
          year: yearNum,
          createdAt: new Date().toISOString(),
        };
        const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(single) });
        if (!res.ok) throw new Error('Failed to save metadata');
        setMessage('Video saved');
        setTitle(''); setCaption(''); setVideoUrl(''); setThumbUrl(''); setFiles([]); setStatuses({}); setYear('');
        setLoading(false);
        void loadItems();
        return;
      }

      if (!files.length) throw new Error('Select one or more files to upload');

      // Bulk upload flow for selected files -> then one metadata save
      const newStatuses: Record<string, 'queued'|'uploading'|'saved'|'error'> = {};
      files.forEach(f => { newStatuses[f.name] = 'queued'; });
      setStatuses(newStatuses);
      setProgress({});

  const created: GalleryItem[] = [];
      const batchSize = 3;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async (f) => {
          try {
            setStatuses(prev => ({ ...prev, [f.name]: 'uploading' }));
            const fileType: 'image'|'video' = f.type.startsWith('video/') ? 'video' : 'image';
            // Use multipart for large files; fallback to single PUT for small ones
            const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB
            if (f.size >= MULTIPART_THRESHOLD) {
              const item = await multipartUpload({ file: f, fileType, categorySlug, categoryLabel, contentType: f.type || 'application/octet-stream', year: yearNum, eventId }, (pct)=> setProgress(prev=>({ ...prev, [f.name]: pct })));
              created.push(item);
              setStatuses(prev => ({ ...prev, [f.name]: 'saved' }));
            } else {
              const single = await singlePutUpload({ file: f, fileType, categorySlug, categoryLabel, contentType: f.type || 'application/octet-stream', year: yearNum, eventId }, (pct)=> setProgress(prev=>({ ...prev, [f.name]: pct })));
              created.push(single);
              setStatuses(prev => ({ ...prev, [f.name]: 'saved' }));
            }
          } catch (err: any) {
            setStatuses(prev => ({ ...prev, [f.name]: 'error' }));
            if (err?.message) setLastError(err.message);
          }
        }));
      }

      if (created.length) {
        const res = await fetch('/api/gallery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulk', items: created }) });
        if (!res.ok) throw new Error('Failed to save gallery metadata');
      }

      if (created.length === 0) {
        setMessage(`Bulk upload complete (0 saved)${lastError ? ` — ${lastError}` : ''}`);
      } else {
        setMessage(`Bulk upload complete (${created.length} saved)`);
      }
      setFiles([]); setTitle(''); setCaption(''); setThumbUrl(''); setYear('');
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
                  <select value={type} onChange={(e)=>setType(e.target.value as any)} className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white">
                    <option value="auto">Auto (mixed)</option>
                    <option value="image">Image only</option>
                    <option value="video">Video only</option>
                  </select>
                </div>
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-900">Category / Event</label>
                  <input
                    list="existing-categories"
                    value={category}
                    onFocus={()=> { setCatOpen(true); setCategoryQuery(''); }}
                    onChange={(e)=>onCategoryChange(e.target.value)}
                    onBlur={(e)=>{ const v=e.target.value; setTimeout(()=>{ setCatOpen(false); onCategoryBlur(v); }, 100); }}
                    className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white"
                    placeholder="e.g. retreat-2025"
                  />
                  <datalist id="existing-categories">
                    {existingCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {catOpen && filteredCategories.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white text-gray-900 shadow">
                      {filteredCategories.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onMouseDown={()=>{ setCategory(opt.type === 'event' ? opt.label.replace(' (Event)', '') : opt.value); setCategoryQuery(''); setCatOpen(false); }}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">Pick an existing event from the list or type a new one. We’ll auto-slugify it.</div>
                  <div className="mt-1 text-xs text-gray-500">Will save as: <span className="font-mono text-gray-900">{categoryPreview || '—'}</span></div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-white/50">
                <div className="mb-3 text-sm font-medium text-gray-700">Details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Title</label>
                    <input value={title} onChange={(e)=>setTitle(e.target.value)} className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">Caption</label>
                    <input value={caption} onChange={(e)=>setCaption(e.target.value)} className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white" />
                  </div>
                </div>
              </div>

              {type === 'video' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-900">Video URL (YouTube/Vimeo or direct)</label>
                  <input value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="https://youtu.be/..." />
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
                          <div className="mt-2">
                            <div className="text-xs flex items-center justify-between">
                              <span className="truncate max-w-[8rem]" title={f.name}>{f.name}</span>
                              <span className="font-medium">
                                {statuses[f.name] === 'uploading' && <span className="text-gray-700">Uploading… {Math.floor(progress[f.name] || 0)}%</span>}
                                {statuses[f.name] === 'saved' && <span className="text-green-700">Saved</span>}
                                {statuses[f.name] === 'error' && <span className="text-red-700">Error</span>}
                                {!statuses[f.name] && <span className="text-gray-500">Queued</span>}
                              </span>
                            </div>
                            {statuses[f.name] === 'uploading' && (
                              <div className="mt-1 h-2 w-full bg-gray-200 rounded">
                                <div className="h-2 bg-gray-900 rounded" style={{ width: `${Math.max(1, Math.min(100, Math.floor(progress[f.name] || 0))) }%` }} />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Year</label>
                <input value={year} onChange={(e)=>setYear(e.target.value)} type="number" className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">Thumbnail URL (for videos)</label>
                <input value={thumbUrl} onChange={(e)=>setThumbUrl(e.target.value)} className="mt-1 w-full border border-gray-300 focus:border-gray-500 focus:ring-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder:text-gray-500 bg-white" placeholder="https://.../thumb.jpg" />
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
