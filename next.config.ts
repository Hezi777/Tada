import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["groq-sdk", "papaparse", "xlsx"],
  images: {
    disableStaticImages: true,
  },
};

export default nextConfig;
