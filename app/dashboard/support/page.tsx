import { auth } from "@/lib/auth";
import SupportPageClient from "@/components/dashboard/SupportPageClient";

export default async function DashboardSupportPage() {
  const session = await auth();

  return <SupportPageClient userId={session?.user?.id ?? null} />;
}
