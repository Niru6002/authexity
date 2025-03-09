/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
        NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    },
};

export default nextConfig;
  