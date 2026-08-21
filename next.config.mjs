/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    poweredByHeader: false,
    distDir: process.env.NEXT_DIST_DIR || ".next",
    images: {
        remotePatterns: [
        ],
    },
};

export default nextConfig;
