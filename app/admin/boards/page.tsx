import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import AdminShell from "@/app/admin/AdminShell";
import BoardsClient from "@/app/admin/boards/BoardsClient";

export const metadata = { title: "Manage Boards" };

export default async function AdminBoardsPage() {
  if (!(await isAdminSession())) redirect("/admin");

  return (
    <AdminShell current="boards" title="Boards">
      <BoardsClient />
    </AdminShell>
  );
}
