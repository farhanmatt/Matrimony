import type { ReactNode } from "react";

interface AdminListCardProps {
  toolbar?: ReactNode;
  summaryLeft?: ReactNode;
  summaryRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function AdminListCard({
  toolbar,
  summaryLeft,
  summaryRight,
  footer,
  className,
  children,
}: AdminListCardProps) {
  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] ${
        className ?? ""
      }`}
    >
      {toolbar ? (
        <div className="shrink-0 border-b border-slate-100 px-4 py-4 sm:px-6">{toolbar}</div>
      ) : null}

      {summaryLeft || summaryRight ? (
        <div className="shrink-0 flex flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">{summaryLeft}</div>
          <div className="relative z-10 shrink-0 whitespace-nowrap">{summaryRight}</div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-slate-100 px-4 py-4 sm:px-6">{footer}</div>
      ) : null}
    </div>
  );
}
