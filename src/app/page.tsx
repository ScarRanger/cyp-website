import HomePage from "./components/HomePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Welcome to Christian Youth in Power (CYP) Vasai - A vibrant Catholic youth community empowering young people through faith, fellowship, and service. Join us every Monday at 7 PM.",
  openGraph: {
    title: "Christian Youth in Power (CYP) Vasai - Home",
    description: "A vibrant Catholic youth community empowering young people through faith, fellowship, and service.",
    url: "https://www.cypvasai.org",
  },
  alternates: {
    canonical: "https://www.cypvasai.org",
  },
};

export default function Home() {
  return (
    <div>
      <HomePage />
    </div>
  );
}
