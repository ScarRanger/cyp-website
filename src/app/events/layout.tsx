import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events",
  description: "Explore upcoming CYP Vasai events including retreats, prayer meetings, outreach programs, and youth gatherings. Join our vibrant Catholic youth community.",
  openGraph: {
    title: "CYP Vasai Events - Catholic Youth Gatherings",
    description: "Join us for retreats, prayer meetings, and youth events in Vasai-Virar. Building faith and community together.",
    url: "https://www.cypvasai.org/events",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
