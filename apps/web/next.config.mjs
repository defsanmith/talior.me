/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@tailor.me/shared"],
  // Produce a minimal standalone server bundle for Docker production builds.
  // The output is placed in .next/standalone and does not require node_modules
  // at runtime (all dependencies are inlined).
  output: "standalone",
};

export default nextConfig;
