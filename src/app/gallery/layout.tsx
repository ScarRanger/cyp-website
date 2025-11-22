import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Browse photos and videos from CYP Vasai events, retreats, outreach programs, and youth gatherings. Moments of faith, fellowship, and fun captured.",
  openGraph: {
    title: "CYP Vasai Gallery - Faith & Fellowship Moments",
    description: "Browse our collection of photos and videos from retreats, outreach programs, and youth gatherings in Vasai.",
    url: "https://www.cypvasai.org/gallery",
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
