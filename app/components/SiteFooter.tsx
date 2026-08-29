import Link from "next/link";
import { site } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line px-4 py-8 sm:px-8 lg:px-14">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 text-xs leading-relaxed text-taupe sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span className="max-w-md">{site.affiliateDisclosure}</span>
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${site.contactEmail}`}
            className="inline-flex min-h-11 items-center hover:text-oxblood sm:min-h-0"
          >
            {site.contactEmail}
          </a>
          {/* Only navigation to /admin from inside the installed app (it has
              no address bar) — the passcode + rate limiting behind it is the
              real protection, not hiding the link. */}
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center hover:text-oxblood sm:min-h-0"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
