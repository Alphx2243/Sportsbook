/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    distDir: process.env.NEXT_DIST_DIR || ".next",
    experimental: {
        serverActions: { bodySizeLimit: '10mb' },
    },
    images: {
        remotePatterns: [
        ],
    },
};

export default nextConfig;
