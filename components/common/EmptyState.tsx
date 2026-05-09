import { Heart, Search, AlertCircle } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: "heart" | "search" | "default";
  title: string;
  description?: string;
  action?: { label: string; href: string };
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
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-5">
        <Icon className="w-10 h-10 text-rose-300" />
      </div>
      <h3 className="text-lg font-display font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-primary text-sm py-2.5 px-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}
