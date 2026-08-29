import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

// Next.js renders this in place of its own bare default whenever notFound()
// is called or a route just doesn't exist — e.g. a stale/mistyped link to a
// board or product. Keeps the header/footer and theme instead of dropping
// the visitor onto an unstyled dead end.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="font-serif text-6xl text-taupe">404</p>
        <h1 className="mt-3 font-serif text-2xl text-ink sm:text-3xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          The link might be old, or the pin may have moved. Let&apos;s get you back to
          somewhere real.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-on-forest transition hover:opacity-90"
        >
          Back to all boards
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
