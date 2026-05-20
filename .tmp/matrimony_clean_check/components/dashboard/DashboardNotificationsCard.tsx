"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
};

type DashboardNotificationsCardProps = {
  items: NotificationItem[];
};

const DEFAULT_VISIBLE_NOTIFICATIONS = 3;

function NotificationRow({ item }: { item: NotificationItem }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Heart className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-5 text-gray-900">{item.title}</p>
        <p className="text-[11px] leading-4 text-gray-500">{item.subtitle}</p>
        <p className="mt-1 text-[10px] font-medium text-gray-400">{item.time}</p>
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
    <section className="rounded-[14px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold leading-tight text-gray-900">
          Notifications
        </h2>

        {hasExtraNotifications ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
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
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {extraItems.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
