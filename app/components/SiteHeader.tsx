import Link from "next/link";
import Image from "next/image";
import logo from "@/public/logo.png";
import { site } from "@/lib/site";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8 sm:py-4 lg:px-14">
        <Link href="/" className="flex items-center">
          <Image
            src={logo}
            alt={site.name}
            className="h-8 w-auto sm:h-9"
            priority
          />
        </Link>
        <nav className="flex items-center gap-5 sm:gap-8">
          <Link
            href="/"
            className="hidden items-center text-sm font-medium sm:inline-flex"
          >
            Boards
          </Link>
          <a
            href={site.pinterestUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center text-sm font-medium text-oxblood"
          >
            Pinterest ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
