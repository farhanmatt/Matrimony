import { cn } from "@/lib/utils/helpers";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, string> = {
  ACTIVE: "badge-active",
  INACTIVE: "badge-inactive",
  SUSPENDED: "badge-suspended",
  DRAFT: "badge-draft",
  PAID: "badge-active",
  CREATED: "badge-draft",
  FAILED: "badge-suspended",
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  DRAFT: "Draft",
  PAID: "Paid",
  CREATED: "Pending",
  FAILED: "Failed",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusMap[status] ?? "badge-inactive", className)}>
      {statusLabels[status] ?? status}
    </span>
  );
}
