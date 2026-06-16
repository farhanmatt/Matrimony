import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, CreditCard, HeartHandshake, UserCheck, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import { getAdminNotifications } from "@/lib/utils/admin-notifications";

export const metadata: Metadata = { title: "Notifications - Admin" };

const KIND_STYLES = {
  user: {
    label: "User",
    icon: Users,
    iconClassName: "text-emerald-600",
    iconBgClassName: "bg-emerald-50",
  },
  profile: {
    label: "Profile",
    icon: UserCheck,
    iconClassName: "text-rose-600",
    iconBgClassName: "bg-rose-50",
  },
  match: {
    label: "Match",
    icon: HeartHandshake,
    iconClassName: "text-violet-600",
    iconBgClassName: "bg-violet-50",
  },
  payment: {
    label: "Payment",
    icon: CreditCard,
    iconClassName: "text-amber-600",
    iconBgClassName: "bg-amber-50",
  },
} as const;

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  try {
    const notifications = await getAdminNotifications();

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">Notifications</h1>
            <p className="mt-2 text-sm text-gray-500">
              Full platform activity feed with every notification detail.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
            <Bell className="h-4 w-4 text-rose-500" />
            {notifications.length} notifications
          </div>
        </div>

        <AdminListCard
          toolbar={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-gray-900">All Notifications</h2>
                <p className="mt-1 text-sm text-gray-500">
                  New users, profiles, matches, and payments in chronological order.
                </p>
              </div>
              <div className="text-sm text-gray-500">Latest activity first</div>
            </div>
          }
          summaryLeft={<span className="font-medium text-slate-700">{notifications.length} total notifications</span>}
        >
          {notifications.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
              <div className="max-w-md rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 px-8 py-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-500 shadow-sm">
                  <Bell className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gray-900">No notifications yet</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  New registrations, profile updates, matches, and payments will appear here.
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/40">
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                    Activity
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                    Details
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                    Date & Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {notifications.map((item) => {
                  const style = KIND_STYLES[item.kind];
                  const Icon = style.icon;

                  return (
                    <tr key={item.id} className="align-top hover:bg-rose-50/30">
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${style.iconBgClassName}`}>
                            <Icon className={`h-3.5 w-3.5 ${style.iconClassName}`} />
                          </div>
                          {style.label}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{item.title}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-2xl whitespace-normal leading-6 text-gray-600">{item.detail}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600">{item.createdAtLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AdminListCard>
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load notifications right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Notifications unavailable"
          description="We couldn't reach the database to load the notifications feed."
        />
      </div>
    );
  }
}
