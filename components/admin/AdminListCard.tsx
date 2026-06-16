import type { ReactNode } from "react";

interface AdminListCardProps {
  toolbar?: ReactNode;
  summaryLeft?: ReactNode;
  summaryRight?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export default function AdminListCard({
  toolbar,
  summaryLeft,
  summaryRight,
  footer,
  className,
  bodyClassName,
  children,
}: AdminListCardProps) {
  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)] ${
        className ?? ""
      }`}
    >
      {toolbar ? (
        <div className="shrink-0 border-b border-rose-100/80 px-5 py-5 sm:px-6">{toolbar}</div>
      ) : null}

      {summaryLeft || summaryRight ? (
        <div className="shrink-0 flex flex-col gap-2 border-b border-rose-100/80 bg-rose-50/20 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">{summaryLeft}</div>
          <div className="relative z-10 shrink-0 whitespace-nowrap">{summaryRight}</div>
        </div>
      ) : null}

      <div
        className={`flex-1 min-h-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          bodyClassName ?? ""
        }`}
      >
        {children}
      </div>

      {footer ? (
        <div className="shrink-0 border-t border-rose-100/80 px-5 py-4 sm:px-6">{footer}</div>
      ) : null}
    </div>
  );
}
