/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // NOTE:
    // - In Docker, "localhost" inside the frontend container is the container itself,
    //   so rewrites must target the backend service name (e.g. http://backend:8000).
    // - In local dev (no Docker), NEXT_PUBLIC_API_URL typically points to localhost.
    const apiUrl = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
