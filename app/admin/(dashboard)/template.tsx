import AdminPageTransition from "@/components/admin/AdminPageTransition";
import { ReactNode } from "react";

export default function AdminDashboardTemplate({ children }: { children: ReactNode }) {
  return <AdminPageTransition className="w-full">{children}</AdminPageTransition>;
}
