import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Applies everywhere, including /admin — the passcode screen is the
        // one page where clickjacking protection matters most.
        source: "/:path*",
        headers: [
          // Stops the site being loaded inside a hidden iframe on another
          // site (clickjacking) — nothing here needs to be framed.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser guessing a file's type from its content
          // instead of trusting the Content-Type we send.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full URL as a referrer only to our own origin; other
          // sites just get the origin, not the specific page/product.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Nothing on this site uses the camera, mic, or location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
