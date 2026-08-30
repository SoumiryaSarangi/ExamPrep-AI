/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Override the default webpack configuration to fix @huggingface/transformers issues
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
    }
    return config
  },
}

export default nextConfig