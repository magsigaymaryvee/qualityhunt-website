import Link from "next/link";
import type { Product } from "@/lib/types";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group mb-3 flex break-inside-avoid flex-col overflow-hidden rounded-xl bg-paper-2 shadow-[0_2px_8px_rgba(23,21,15,0.05)] transition hover:shadow-[0_6px_18px_rgba(23,21,15,0.09)] sm:mb-5 lg:rounded-2xl"
    >
      {product.image_url && (
        <div className="w-full overflow-hidden bg-line">
          {/* eslint-disable-next-line @next/next/no-img-element -- product images are pasted URLs from arbitrary retailers. */}
          <img
            src={product.image_url}
            alt=""
            className="w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1 p-3 pb-3.5 sm:p-4">
        {product.tagline && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-oxblood">
            {product.tagline}
          </p>
        )}
        <h3 className="text-[13px] font-semibold leading-snug sm:text-[15px]">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}
