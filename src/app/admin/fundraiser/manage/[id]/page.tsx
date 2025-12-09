"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import AuthGuard from "@/app/components/Auth/AuthGuard";

export default function EditFundraiserItemPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [inStock, setInStock] = useState(true);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "fundraiser_items", id));
        if (!snap.exists()) {
          setMsg("Item not found");
          return;
        }
        const d = snap.data() as any;
        setTitle(String(d.title ?? ""));
        setDescription(String(d.description ?? ""));
        setImages(Array.isArray(d.images) ? d.images as string[] : []);
        setPrice(String(d.price ?? ""));
        setCompareAtPrice(d.compareAtPrice != null ? String(d.compareAtPrice) : "");
        setInStock(d.inStock !== false);
        setActive(d.active !== false);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const canSave = useMemo(() => {
    const p = Number(price);
    const cp = compareAtPrice ? Number(compareAtPrice) : undefined;
    return (
      title.trim().length > 0 &&
      description.trim().length > 0 &&
      images.filter((u) => u.trim().length > 0).length > 0 &&
      !Number.isNaN(p) && p > 0 &&
      (cp === undefined || (!Number.isNaN(cp) && (cp as number) > p))
    );
  }, [title, description, images, price, compareAtPrice]);

  const addImageField = () => setImages((prev) => [...prev, ""]);
  const changeImage = (i: number, v: string) => setImages((prev) => prev.map((u, idx) => (idx === i ? v : u)));
  const removeImageField = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleMultipleFileUpload = async (i: number, files: FileList) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    
    for (let idx = 0; idx < fileArr.length; idx++) {
      const f = fileArr[idx];
      try {
        setUploadingIdx(i);
        const fd = new FormData();
        fd.append("file", f);
        fd.append("uploadType", "image");
        fd.append("isAdminUpload", "true");
        fd.append("productId", id);
        fd.append("imageIndex", String(i + idx + 1));
        
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        
        if (data?.success && data?.url) {
          setImages((prev) => {
            const next = [...prev];
            if (idx === 0) {
              next[i] = data.url as string;
            } else {
              next.push(data.url as string);
            }
            return next;
          });
          setMsg("Image uploaded");
        } else {
          setMsg("Upload failed");
        }
      } catch {
        setMsg("Upload failed");
      } finally {
        setUploadingIdx(null);
      }
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setMsg("");
      await updateDoc(doc(db, "fundraiser_items", id), {
        title: title.trim(),
        description: description.trim(),
        images: images.map((u) => u.trim()).filter(Boolean),
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        inStock,
        active,
      });
      setMsg("Saved");
      router.back();
    } catch (e) {
      setMsg("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "mt-1 w-full border border-[#FB923C]/30 focus:border-[#FB923C] focus:ring-[#FB923C] rounded-md px-3 h-10 text-[#FAFAFA] bg-white/5 placeholder:text-[#FAFAFA]/30";
  const labelClass = "block text-sm font-medium text-[#FAFAFA]/90";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#1C1917]">
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-[#FB923C] hover:text-[#FCD34D] hover:bg-white/5">← Back</Button>
          </div>
          <h1 className="text-2xl font-bold text-[#FAFAFA] mb-4">Edit Fundraiser Item</h1>
          {loading ? (
            <div className="text-[#FAFAFA]/50">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="block">
                  <span className={labelClass}>Title</span>
                  <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelClass}>Description</span>
                  <textarea className={`${inputClass} py-2 h-auto`} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
                <div>
                  <div className="flex items-center justify-between">
                    <span className={labelClass}>Images (URLs)</span>
                    <Button size="sm" variant="outline" onClick={addImageField} className="border-[#FB923C]/30 text-[#FB923C] hover:bg-[#FB923C]/10">Add Image</Button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {images.map((u, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input className={inputClass} value={u} onChange={(e) => changeImage(i, e.target.value)} placeholder="https://..." />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="text-[#FAFAFA] file:mr-3 file:rounded-md file:border-0 file:bg-[#FB923C] file:px-3 file:py-2 file:text-sm file:text-[#1C1917] hover:file:bg-[#FCD34D]"
                          onChange={(e) => {
                            const fl = e.target.files;
                            if (fl && fl.length > 0) {
                              handleMultipleFileUpload(i, fl);
                            }
                          }}
                        />
                        {images.length > 1 && (
                          <Button variant="ghost" onClick={() => removeImageField(i)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">Remove</Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelClass}>Price (₹)</span>
                    <input type="number" min="1" className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className={labelClass}>Compare-at (₹)</span>
                    <input type="number" min="1" className={inputClass} value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="text-[#FB923C] focus:ring-[#FB923C] bg-white/5 border-[#FB923C]/30 rounded" />
                    <span className="text-[#FAFAFA]">In Stock</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="text-[#FB923C] focus:ring-[#FB923C] bg-white/5 border-[#FB923C]/30 rounded" />
                    <span className="text-[#FAFAFA]">Active</span>
                  </label>
                </div>
                <Button className="w-full bg-[#FB923C] text-[#1C1917] hover:bg-[#FCD34D]" disabled={!canSave || saving} onClick={save}>{saving ? "Saving..." : "Save Changes"}</Button>
                {msg && <div className="text-sm text-[#FAFAFA]/70">{msg}</div>}
              </div>
              <div className="rounded-lg border border-[#FB923C]/30 p-3 bg-[#1C1917]">
                <div className="text-sm text-[#FAFAFA]/70">Preview</div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {images.filter(Boolean).slice(0, 2).map((u, i) => (
                    <img key={i} src={u} alt="preview" className="aspect-square object-cover rounded-md border border-[#FB923C]/30" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
