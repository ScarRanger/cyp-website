'use client';

import AuthGuard from '@/app/components/Auth/AuthGuard';
import SecureVideoPlayer from "../../../components/SecureVideoPlayer";
import NoDownload from "../../../components/NoDownload";

function decodeKeyParam(param: string | string[]): string {
  const joined = Array.isArray(param) ? param.join("/") : param;
  try {
    return decodeURIComponent(joined);
  } catch {
    return joined;
  }
}

export default function Page({ params }: { params: { key: string[] } }) {
  const key = decodeKeyParam(params?.key || []);
  return (
    <AuthGuard>
      <NoDownload>
        <main className="mx-auto max-w-5xl p-4">
          <div className="mb-2">
            <a href="/cgstalk" className="text-sm text-blue-700 hover:underline">← Back to CGS Talks</a>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 break-words">CGS Talks</h1>
          <div className="text-xs text-slate-600 mb-4 break-words">{key}</div>
          <div className="relative rounded-lg overflow-hidden bg-slate-900">
            <SecureVideoPlayer className="w-full aspect-video" videoKey={key} autoPlay={false} />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* <div className="select-none text-white/15 text-sm md:text-base backdrop-blur-[1px] px-2 py-1 rounded animate-pulse">
                CYP • Secured • {new Date().toLocaleString()}
              </div> */}
            </div>
          </div>
        </main>
      </NoDownload>
    </AuthGuard>
  );
}
