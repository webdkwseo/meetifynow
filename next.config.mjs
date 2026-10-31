import { fileURLToPath } from "url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: "./dist",
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
