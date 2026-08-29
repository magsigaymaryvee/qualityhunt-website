"use client";

import { useRef } from "react";

// A plain textarea plus a "Bold" button that wraps the current selection in
// ** markers — the whole formatting vocabulary this project supports,
// deliberately, rather than pulling in a rich text editor for one field.
// FormattedText (rendered on the public product page) is what turns those
// markers into real bold text.
export default function BoldableTextarea({
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className: string;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function toggleBold() {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const selected = value.slice(selectionStart, selectionEnd);
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const wrapped = selected ? `**${selected}**` : "****";
    onChange(`${before}${wrapped}${after}`);

    // Land the cursor somewhere useful: right between the markers if
    // nothing was selected (ready to type), or just past the now-bolded
    // text otherwise. Needs a tick — onChange hasn't re-rendered yet.
    requestAnimationFrame(() => {
      el.focus();
      const cursor = selected ? before.length + wrapped.length : before.length + 2;
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={toggleBold}
        aria-label="Bold the selected text"
        title="Bold the selected text"
        className="w-fit rounded-sm border border-line px-2 py-0.5 font-serif text-xs font-bold leading-none text-ink-soft transition hover:border-ink hover:text-ink"
      >
        B
      </button>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={className}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}
