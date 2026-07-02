import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking protection lives in CSP frame-ancestors below, which allows
  // ONLY Shopify admin to embed the app (it runs as an embedded Shopify app).
  // X-Frame-Options is intentionally omitted: it can't express an allowlist
  // and would override the CSP in some browsers, breaking the embedded app.
  // Stop browsers from MIME-sniffing responses
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send the origin as referrer to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years once visited over HTTPS
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Disable powerful browser features the app doesn't use
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-src 'self' https://www.facebook.com https://web.facebook.com https://www.instagram.com",
      "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Never cache authenticated API responses in shared caches/proxies
        source: "/api/(.*)",
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
};

export default nextConfig;
