"use client";

import { PropsWithChildren, useEffect } from "react";

export default function NoDownload({ children }: PropsWithChildren) {
  useEffect(() => {
    function prevent(e: Event) { e.preventDefault(); }
    function keydown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "s" || e.key.toLowerCase() === "p")) {
        e.preventDefault();
      }
    }
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("dragstart", prevent);
    document.addEventListener("keydown", keydown, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("dragstart", prevent);
      document.removeEventListener("keydown", keydown, { capture: true } as any);
    };
  }, []);

  return (
    <div style={{ userSelect: "none" }}>
      {children}
    </div>
  );
}
