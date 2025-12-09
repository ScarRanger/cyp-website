"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import Link from "next/link";
import AuthGuard from "@/app/components/Auth/AuthGuard";

export default function AdminFundraiserAddPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([""]);
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [inStock, setInStock] = useState(true);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

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
    // Upload sequentially to keep order predictable
    for (let idx = 0; idx < fileArr.length; idx++) {
      const f = fileArr[idx];
      try {
        setUploadingIdx(i);
        const fd = new FormData();
        fd.append("file", f);
        fd.append("uploadType", "image");
        fd.append("isAdminUpload", "true");
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
          setMessage("Image uploaded");
        } else {
          setMessage("Upload failed");
        }
      } catch {
        setMessage("Upload failed");
      } finally {
        setUploadingIdx(null);
      }
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      
      // Create the product first to get the ID
      const docRef = await addDoc(collection(db, "fundraiser_items"), {
        title: title.trim(),
        description: description.trim(),
        images: [], // Empty initially
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : undefined,
        inStock,
        active,
        createdAt: serverTimestamp(),
      });
      
      const productId = docRef.id;
      
      // Now re-upload images with proper product ID structure
      const finalImageUrls: string[] = [];
      const imageUrls = images.map((u) => u.trim()).filter(Boolean);
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        
        // If it's a temp S3 URL, we need to re-upload with proper structure
        if (imageUrl.includes('fundraiser/temp/')) {
          try {
            // Download the temp image
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            // Re-upload with product ID
            const fd = new FormData();
            fd.append("file", blob, `image-${i + 1}.jpg`);
            fd.append("uploadType", "image");
            fd.append("isAdminUpload", "true");
            fd.append("productId", productId);
            fd.append("imageIndex", String(i + 1));
            
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            
            if (data?.success && data?.url) {
              finalImageUrls.push(data.url);
            } else {
              // Fallback to original URL if re-upload fails
              finalImageUrls.push(imageUrl);
            }
          } catch {
            // If re-upload fails, use original temp URL
            finalImageUrls.push(imageUrl);
          }
        } else {
          // Keep non-temp URLs as-is
          finalImageUrls.push(imageUrl);
        }
      }
      
      // Update product with final image URLs
      await updateDoc(docRef, {
        images: finalImageUrls
      });
      
      setTitle("");
      setDescription("");
      setImages([""]);
      setPrice("");
      setCompareAtPrice("");
      setInStock(true);
      setActive(true);
      setMessage("Saved successfully");
    } catch (e) {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "mt-1 w-full border border-[#FB923C]/30 focus:border-[#FB923C] focus:ring-[#FB923C] rounded-md px-3 h-10 text-[#FAFAFA] bg-white/5 placeholder:text-[#FAFAFA]/30";
  const labelClass = "block text-sm font-medium text-[#FAFAFA]/90";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#1C1917]">
        <div className="max-w-4xl mx-auto p-4 space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-[#FAFAFA]">Fundraiser Admin</h1>
            <Link href="/admin/fundraiser/manage" className="text-[#FB923C] hover:underline">Manage Listings</Link>
          </div>

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
              <Button className="w-full bg-[#FB923C] text-[#1C1917] hover:bg-[#FCD34D]" disabled={!canSave || saving} onClick={save}>{saving ? "Saving..." : "Save Item"}</Button>
              {message && <div className="text-sm text-[#FAFAFA]/70">{message}</div>}
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
        </div>
      </div>
    </AuthGuard>
  );
}
