import type { NextConfig } from "next";

const endpoint = process.env.APPWRITE_ENDPOINT;

let images: NextConfig["images"] = undefined;
if (endpoint) {
  try {
    const u = new URL(endpoint);
    images = {
      remotePatterns: [
        {
          protocol: u.protocol.replace(":", "") as "http" | "https",
          hostname: u.hostname,
          pathname: "/v1/storage/buckets/**",
        },
      ],
    };
  } catch {}
}

const nextConfig: NextConfig = {
  images,
};

export default nextConfig;
