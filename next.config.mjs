// When deploying to GitHub Pages the site is served from https://<user>.github.io/<repo>/
// The workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo>" so assets resolve correctly.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
