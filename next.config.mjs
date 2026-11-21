/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    distDir: process.env.NEXT_DIST_DIR || ".next",
    experimental: {
        middlewareClientMaxBodySize: '25mb',
        serverActions: { bodySizeLimit: '25mb' },
    },
    images: {
        remotePatterns: [
        ],
    },
};

export default nextConfig;
