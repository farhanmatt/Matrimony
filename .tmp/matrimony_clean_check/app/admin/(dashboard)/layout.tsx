import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <AdminSidebar />
      <main className="min-h-screen pt-16 lg:ml-56 lg:pt-0">
        <div className="max-w-none px-3 py-4 sm:px-4 sm:py-5 lg:px-5 lg:py-6">{children}</div>
      </main>
    </div>
  );
}
