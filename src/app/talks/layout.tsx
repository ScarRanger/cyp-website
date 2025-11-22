import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talks",
  description: "Watch and listen to inspiring Catholic talks, sermons, and teachings from CYP Vasai. Faith formation content for young Catholics in Vasai-Virar.",
  openGraph: {
    title: "CYP Vasai Talks - Catholic Youth Teachings",
    description: "Inspiring talks and sermons for young Catholics. Faith formation and spiritual growth content.",
    url: "https://www.cypvasai.org/talks",
  },
};

export default function TalksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
