import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "groq-sdk",
    "papaparse",
    "xlsx",
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
  images: {
    disableStaticImages: true,
  },
};

export default nextConfig;
