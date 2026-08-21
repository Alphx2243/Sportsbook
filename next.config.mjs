/** @type {import('next').NextConfig} */
const nextConfig = {
    distDir: process.env.NEXT_DIST_DIR || ".next",
    images: {
        remotePatterns: [
        ],
    },
};

export default nextConfig;
