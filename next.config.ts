import type { NextConfig } from "next";

const endpoint = process.env.APPWRITE_ENDPOINT;
const s3PublicBase = process.env.AWS_S3_PUBLIC_BASEURL;
const s3Bucket = process.env.AWS_S3_BUCKET;

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

// Also allow S3/CloudFront domain if provided
if (s3PublicBase) {
  try {
    const u = new URL(s3PublicBase);
    const s3Pattern = {
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      pathname: "**",
    } as const;
    if (!images) {
      images = { remotePatterns: [s3Pattern] };
    } else if (images.remotePatterns) {
      images.remotePatterns.push(s3Pattern as any);
    }
  } catch {}
}

// If no public base URL is set, our upload route defaults to https://<bucket>.s3.amazonaws.com
// Add that hostname so next/image can optimize these URLs.
if (s3Bucket) {
  const s3DefaultHost = `${s3Bucket}.s3.amazonaws.com`;
  const pattern = {
    protocol: "https" as const,
    hostname: s3DefaultHost,
    pathname: "**",
  };
  if (!images) {
    images = { remotePatterns: [pattern] };
  } else if (images.remotePatterns) {
    images.remotePatterns.push(pattern as any);
  }
}

const nextConfig: NextConfig = {
  images,
};

export default nextConfig;
