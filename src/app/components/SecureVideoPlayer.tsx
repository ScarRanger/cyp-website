"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  videoKey: string;
  token?: string;
  className?: string;
  autoPlay?: boolean;
  poster?: string;
};

export default function SecureVideoPlayer({ videoKey, token, className, autoPlay, poster }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);

  const apiUrl = useMemo(() => {
    const p = new URLSearchParams({ key: videoKey });
    return `/api/secure-video?${p.toString()}`;
  }, [videoKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setSignedUrl(null);
      try {
        const res = await fetch(apiUrl, {
          method: "GET",
          headers: token ? { "x-auth-token": token } : undefined,
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to get signed URL (${res.status})`);
        }
        const data = (await res.json()) as { url?: string };
        if (!data?.url) throw new Error("No URL returned");
        if (!cancelled) setSignedUrl(data.url);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Unexpected error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, token]);

  useEffect(() => {
    const el = mediaRef.current as any;
    if (!el) return;
    el.setAttribute("controlsList", "nodownload noremoteplayback");
    if ("disablePictureInPicture" in el) {
      el.disablePictureInPicture = true;
    }
  }, [signedUrl]);

  // Optional HLS support via hls.js for .m3u8
  useEffect(() => {
    const el = mediaRef.current as HTMLVideoElement | null;
    if (!el || !signedUrl) return;
    const isM3U8 = (videoKey.split(".").pop() || "").toLowerCase() === "m3u8";
    if (!isM3U8) return;
    const hasNative = (el as any).canPlayType && (el as any).canPlayType('application/vnd.apple.mpegurl');
    let hls: any;
    let cancelled = false;
    (async () => {
      try {
        if (!hasNative) {
          const mod = await import('hls.js');
          if (cancelled) return;
          const Hls = (mod as any).default;
          if (Hls?.isSupported()) {
            hls = new Hls({ autoStartLoad: true });
            hls.loadSource(signedUrl);
            hls.attachMedia(el);
          } else {
            el.src = signedUrl;
          }
        } else {
          el.src = signedUrl;
        }
      } catch {
        el.src = signedUrl;
      }
    })();
    return () => {
      cancelled = true;
      if (hls) {
        try { hls.destroy(); } catch {}
      }
    };
  }, [signedUrl, videoKey]);

  if (loading) return <div className={className}>Loading video…</div>;
  if (error) return <div className={className}>Error: {error}</div>;
  if (!signedUrl) return <div className={className}>No video available</div>;

  const ext = (videoKey.split(".").pop() || "").toLowerCase();
  const isAudio = ["mp3", "m4a", "aac", "wav", "oga", "ogg", "opus", "webm"].includes(ext);

  if (isAudio) {
    return (
      <audio
        ref={mediaRef as React.RefObject<HTMLAudioElement>}
        className={className}
        controls
        controlsList="nodownload noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        
        disableRemotePlayback
        onError={() => setError("Failed to load audio. Check network and CloudFront permissions.")}
        preload="metadata"
        autoPlay={autoPlay}
        src={signedUrl}
      />
    );
  }

  return (
    <video
      ref={mediaRef as React.RefObject<HTMLVideoElement>}
      className={className}
      controls
      controlsList="nodownload noremoteplayback"
       
      disablePictureInPicture
       
      disableRemotePlayback
      onContextMenu={(e) => e.preventDefault()}
      onError={() => setError("Failed to load video. Check network and CloudFront permissions.")}
      playsInline
      preload="metadata"
      autoPlay={autoPlay}
      poster={poster}
      src={signedUrl}
    />
  );
}
