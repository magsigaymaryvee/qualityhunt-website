"use client";

// Same "Shop this" link as before, just wrapped with a click tracker for the
// admin's benefit. sendBeacon fires the request and returns immediately
// without delaying the outbound navigation (target="_blank" means this page
// never even unloads, but sendBeacon is the standard, fire-and-forget tool
// for this regardless). A failure here should never break the actual link.
export default function BuyButton({
  href,
  productId,
  className,
  children,
}: {
  href: string;
  productId: string;
  className?: string;
  children: React.ReactNode;
}) {
  function trackClick() {
    try {
      const payload = JSON.stringify({ product_id: productId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track-click", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Tracking is a nice-to-have — never let it get in the way of the click.
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener sponsored"
      onClick={trackClick}
      className={className}
    >
      {children}
    </a>
  );
}
