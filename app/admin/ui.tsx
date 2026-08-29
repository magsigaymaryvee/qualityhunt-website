// Shared admin form styling, so every field is phone-friendly (16px text,
// 44px+ tap targets) in one place.
export const inputClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-[15px] outline-none transition focus:border-oxblood";

export const btnPrimary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-forest px-5 text-[15px] font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50 sm:w-fit";

export const btnGhost =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-paper-2 px-5 text-[15px] font-semibold transition hover:border-oxblood sm:w-fit";

export const btnRow =
  "inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-line px-4 text-[13px] font-medium transition hover:border-oxblood sm:flex-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs leading-5 text-taupe">{hint}</span>}
    </label>
  );
}
