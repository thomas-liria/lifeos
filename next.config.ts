import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Block other sites from embedding LifeOS in an iframe
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Stop the referrer from leaking your URL to external sites
          { key: "Referrer-Policy", value: "no-referrer" },
          // Only allow resources from your own origin + Vercel infra
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Scripts: self + Next.js inline chunks
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // Styles: self + inline (Tailwind needs this)
              "style-src 'self' 'unsafe-inline'",
              // Images: self + data URIs
              "img-src 'self' data: blob:",
              // API calls the app makes
              "connect-src 'self' https://api.anthropic.com https://www.googleapis.com https://oauth2.googleapis.com https://api.getjobber.com",
              // Fonts: self only
              "font-src 'self'",
              // No plugins ever
              "object-src 'none'",
              // Base tag restricted
              "base-uri 'self'",
              // Forms only to self
              "form-action 'self'",
            ].join("; "),
          },
          // Enforce HTTPS for 1 year once first visited
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Disable browser features LifeOS doesn't need
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
