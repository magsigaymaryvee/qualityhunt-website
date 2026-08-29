"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center text-[13px] font-medium text-current opacity-80 transition hover:opacity-100"
    >
      Sign out
    </button>
  );
}
