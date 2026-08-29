import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import AdminShell from "@/app/admin/AdminShell";
import ReviewsClient from "@/app/admin/reviews/ReviewsClient";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  if (!(await isAdminSession())) redirect("/admin");

  return (
    <AdminShell current="reviews" title="Reviews">
      <ReviewsClient />
    </AdminShell>
  );
}
