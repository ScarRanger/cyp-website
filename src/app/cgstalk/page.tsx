import { headers } from "next/headers";
import NoDownload from "../components/NoDownload";

export default async function Page() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;
  const res = await fetch(`${base}/api/cgstalk/list`, { cache: "no-store" });
  if (!res.ok) {
    return (
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">CGS Talks</h1>
        <div className="text-sm text-red-700">Failed to load talks.</div>
      </main>
    );
  }
  const data = await res.json() as { items: { Key: string; Size: number; LastModified?: string }[] };

  const items = [...data.items].sort((a, b) => {
    const ad = a.LastModified ? new Date(a.LastModified).getTime() : 0;
    const bd = b.LastModified ? new Date(b.LastModified).getTime() : 0;
    return bd - ad;
  });
  const filesOnly = items.filter(it => !it.Key.endsWith('/'));

  return (
    <NoDownload>
      <main className="mx-auto max-w-4xl p-4">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">CGS Talks</h1>
        </div>
        <ul className="divide-y rounded-lg border bg-white shadow-sm">
          {filesOnly.map((it) => {
            const key = it.Key;
            const name = key.split("/").pop() || key;
            const href = `/cgstalk/watch/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
            const when = it.LastModified ? new Date(it.LastModified).toLocaleString() : "";
            return (
              <li key={key} className="px-4 py-3 hover:bg-slate-50">
                <a className="flex items-center justify-between gap-3 no-underline" href={href}>
                  <div className="min-w-0">
                    <div className="truncate text-slate-900 font-medium">{name}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{when}</div>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      </main>
    </NoDownload>
  );
}

