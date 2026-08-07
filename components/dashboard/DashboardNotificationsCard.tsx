"use client";

import { Heart, Activity } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export type NotificationItem = {
  id: string;
  type?: "LIKE" | "HEALTH_REQUEST";
  title: string;
  subtitle: string;
  time: string;
};

type DashboardNotificationsCardProps = {
  items: NotificationItem[];
};

const DEFAULT_VISIBLE_NOTIFICATIONS = 3;

function NotificationRow({ item }: { item: NotificationItem }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAction = async (status: "ACCEPTED" | "REJECTED") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/health-requests/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Request ${status.toLowerCase()}!`);
      router.refresh();
    } catch (err) {
      toast.error("Failed to update request");
    } finally {
      setLoading(false);
    }
  };

  const isHealth = item.type === "HEALTH_REQUEST";

  return (
    <div className="rounded-[20px] transition-transform duration-300 hover:translate-x-1">
      <div className="flex items-start gap-3">
        <div className={`ui-icon-lift flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isHealth ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-500 dark:text-sky-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400'}`}>
          {isHealth ? <Activity className="h-4.5 w-4.5" /> : <Heart className="h-4.5 w-4.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-5 text-gray-900 dark:text-slate-100">{item.title}</p>
          <p className="text-[11px] leading-4 text-gray-500 dark:text-slate-400">{item.subtitle}</p>
          <p className="mt-1 text-[10px] font-medium text-gray-400 dark:text-slate-500">{item.time}</p>
          
          {isHealth && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => handleAction("ACCEPTED")}
                disabled={loading}
                className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => handleAction("REJECTED")}
                disabled={loading}
                className="flex-1 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardNotificationsCard({
  items,
}: DashboardNotificationsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const initialItems = items.slice(0, DEFAULT_VISIBLE_NOTIFICATIONS);
  const extraItems = items.slice(DEFAULT_VISIBLE_NOTIFICATIONS);
  const hasExtraNotifications = extraItems.length > 0;

  return (
    <section className="ui-card-lift-soft rounded-[14px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold leading-tight text-gray-900 dark:text-slate-100">
          Notifications
        </h2>

        {hasExtraNotifications ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="ui-link-shift text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:text-rose-700 dark:hover:text-rose-300"
          >
            {isExpanded ? "Show Less" : "View All"}
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {initialItems.map((item) => (
          <NotificationRow key={item.id} item={item} />
        ))}
      </div>

      {hasExtraNotifications && isExpanded ? (
        <div className="ui-enter-up mt-4 space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
          {extraItems.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
