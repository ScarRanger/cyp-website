"use client";

import { useEffect, useState, useRef } from "react";
import { Eye } from "lucide-react";

interface ViewCounterProps {
    talkKey: string;
    className?: string;
}

export default function ViewCounter({ talkKey, className = "" }: ViewCounterProps) {
    const [viewCount, setViewCount] = useState<number | null>(null);
    const hasIncrementedRef = useRef(false);

    useEffect(() => {
        // Use ref to prevent double increment in React Strict Mode
        if (hasIncrementedRef.current) return;
        hasIncrementedRef.current = true;

        async function incrementAndFetch() {
            try {
                // Increment the view count
                const res = await fetch("/api/talks/views", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: talkKey }),
                });

                if (res.ok) {
                    const data = await res.json();
                    setViewCount(data.viewCount);
                }
            } catch (error) {
                console.error("Error incrementing view count:", error);
            }
        }

        incrementAndFetch();
    }, [talkKey]);

    if (viewCount === null) {
        return null;
    }

    return (
        <div className={`flex items-center gap-1.5 text-sm text-[#FAFAFA] opacity-70 ${className}`}>
            <Eye className="h-4 w-4" />
            <span>{viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}</span>
        </div>
    );
}

