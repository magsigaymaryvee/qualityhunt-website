import Link from "next/link";
import type { Board } from "@/lib/types";

export default function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      href={`/boards/${board.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-paper-2 shadow-[0_2px_10px_rgba(23,21,15,0.06)] transition hover:shadow-[0_6px_20px_rgba(23,21,15,0.10)]"
    >
      <div className="aspect-square w-full overflow-hidden bg-line">
        {board.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- covers can be any external URL, so a fixed next/image domain allowlist isn't a good fit.
          <img
            src={board.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-serif text-4xl text-taupe">
            {board.title.slice(0, 1)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 pb-5 sm:p-5 lg:p-6">
        {board.kicker && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-oxblood">
            {board.kicker}
          </p>
        )}
        <h3 className="font-serif text-[22px] leading-tight sm:text-2xl lg:text-[28px]">
          {board.title}
        </h3>
        {board.intro && (
          <p className="line-clamp-3 text-[13px] leading-6 text-ink-soft sm:text-sm">
            {board.intro}
          </p>
        )}
      </div>
    </Link>
  );
}
