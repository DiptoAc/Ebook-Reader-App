const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitorBuild ? { output: "export" } : {}),
  images: { unoptimized: true },
};

export default nextConfig;
