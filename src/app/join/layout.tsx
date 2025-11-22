import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Us",
  description: "Join CYP Vasai - Catholic youth group meeting every Monday at 7 PM at Jeevan Darshan Kendra, Giriz. Register now to connect with young Catholics in Vasai-Virar.",
  openGraph: {
    title: "Join CYP Vasai - Catholic Youth Community",
    description: "Register to join our vibrant Catholic youth community. Monday meetings at 7 PM in Giriz, Vasai.",
    url: "https://www.cypvasai.org/join",
  },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
