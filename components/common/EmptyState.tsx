import { Heart, Search, AlertCircle } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: "heart" | "search" | "default";
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
}

const icons = {
  heart: Heart,
  search: Search,
  default: AlertCircle,
};

export default function EmptyState({
  icon = "default",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div
      className={`flex w-full max-w-2xl flex-col items-center rounded-[28px] border border-rose-100 bg-white/95 px-6 py-16 text-center shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:px-10 ${className ?? ""}`}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-rose-50 text-rose-300">
        <Icon className="h-12 w-12" />
      </div>
      <h3 className="mt-8 text-2xl font-display font-bold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-4 max-w-md text-sm leading-7 text-gray-500">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-8 inline-flex h-12 items-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.25)] transition-transform hover:-translate-y-0.5"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
