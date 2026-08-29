"use client";

import { useState } from "react";
import BoldableTextarea from "@/app/admin/BoldableTextarea";

// Wraps BoldableTextarea (controlled) around these editors' existing
// save-on-blur pattern — typing shouldn't trigger a save on every
// keystroke, only once you click away.
export default function MediaCaptionField({
  initialValue,
  onSave,
  className,
  placeholder,
  rows,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  className: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <BoldableTextarea
      value={value}
      onChange={setValue}
      onBlur={() => {
        if (value !== initialValue) onSave(value);
      }}
      className={className}
      placeholder={placeholder}
      rows={rows}
    />
  );
}
