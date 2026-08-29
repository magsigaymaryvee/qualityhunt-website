import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAdminSession } from "@/lib/admin-auth";
import AdminShell from "@/app/admin/AdminShell";
import ProductsClient from "@/app/admin/products/ProductsClient";

export const metadata = { title: "Manage Products" };

export default async function AdminProductsPage() {
  if (!(await isAdminSession())) redirect("/admin");

  return (
    <AdminShell current="products" title="Products">
      {/* useSearchParams (for the ?board_id= filter) needs a Suspense boundary. */}
      <Suspense fallback={<p className="text-sm text-taupe">Loading…</p>}>
        <ProductsClient />
      </Suspense>
    </AdminShell>
  );
}
