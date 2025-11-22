import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registration Forms",
  description: "Register for CYP Vasai events, retreats, and programs. Fill out registration forms for upcoming Catholic youth activities in Vasai-Virar.",
  openGraph: {
    title: "CYP Vasai Registration Forms",
    description: "Register for upcoming events, retreats, and youth programs at CYP Vasai.",
    url: "https://www.cypvasai.org/forms",
  },
};

export default function FormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
