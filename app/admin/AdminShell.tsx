import Link from "next/link";
import LogoutButton from "@/app/admin/LogoutButton";
import { site } from "@/lib/site";

type Tab = "dashboard" | "boards" | "products" | "reviews";

const tabs: { key: Tab; label: string; href: string; glyph: string }[] = [
  { key: "dashboard", label: "Home", href: "/admin", glyph: "▦" },
  { key: "boards", label: "Boards", href: "/admin/boards", glyph: "▣" },
  { key: "products", label: "Products", href: "/admin/products", glyph: "▤" },
  { key: "reviews", label: "Reviews", href: "/admin/reviews", glyph: "★" },
];

/**
 * Admin chrome: a bottom tab bar on phones, a fixed left sidebar from lg up.
 */
export default function AdminShell({
  current,
  title,
  action,
  children,
}: {
  current: Tab;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 bg-forest px-4 py-6 text-on-forest lg:flex">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-soft">
          {site.name} Admin
        </p>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className={
                "flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm transition " +
                (t.key === current
                  ? "bg-white/15 font-semibold"
                  : "text-forest-soft hover:bg-white/10")
              }
            >
              <span aria-hidden="true">{t.glyph}</span>
              {t.key === "dashboard" ? "Dashboard" : t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 text-[13px] text-forest-soft">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center px-3"
          >
            View site ↗
          </a>
          <div className="px-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8 lg:py-5">
          <h1 className="font-serif text-[26px] leading-none lg:text-3xl">{title}</h1>
          <div className="flex items-center gap-3">
            {action}
            <span className="hidden lg:hidden">
              <LogoutButton />
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-paper-2 pb-3 pt-2 lg:hidden">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={
              "flex min-h-13 flex-1 flex-col items-center justify-center gap-0.5 " +
              (t.key === current ? "text-oxblood" : "text-taupe")
            }
          >
            <span aria-hidden="true" className="text-base">
              {t.glyph}
            </span>
            <span className={t.key === current ? "text-[11px] font-semibold" : "text-[11px]"}>
              {t.label}
            </span>
          </Link>
        ))}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-13 flex-1 flex-col items-center justify-center gap-0.5 text-taupe"
        >
          <span aria-hidden="true" className="text-base">
            ↗
          </span>
          <span className="text-[11px]">Site</span>
        </a>
      </nav>
    </div>
  );
}
