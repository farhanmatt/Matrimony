"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils/helpers";
import { formatCurrency, formatDate } from "@/lib/utils/helpers";

type PaymentTableRow = {
  id: string;
  href: string;
  amount: number;
  baseAmount: number;
  profileAmount: number;
  status: string;
  razorpayOrderId: string;
  createdAt: Date;
  user: { name: string | null; email: string };
};

interface AdminPaymentsTableProps {
  payments: PaymentTableRow[];
}

function SelectableCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-rose-300 bg-white text-rose-700 transition-colors hover:border-rose-500"
      aria-label={ariaLabel}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

export default function AdminPaymentsTable({ payments }: AdminPaymentsTableProps) {
  const router = useRouter();
  const [visiblePayments, setVisiblePayments] = useState(payments);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMenuPosition, setBulkMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const bulkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bulkPanelRef = useRef<HTMLDivElement | null>(null);

  const selectedCount = selectedIds.length;
  const allSelected = visiblePayments.length > 0 && selectedCount === visiblePayments.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setVisiblePayments(payments);
  }, [payments]);

  useEffect(() => {
    if (!bulkOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        bulkMenuRef.current &&
        !bulkMenuRef.current.contains(target) &&
        bulkPanelRef.current &&
        !bulkPanelRef.current.contains(target)
      ) {
        setBulkOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [bulkOpen]);

  useEffect(() => {
    if (!bulkOpen) {
      setBulkMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = bulkTriggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = 200;
      const menuWidth = 224;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);

      setBulkMenuPosition({
        top: Math.max(12, top),
        left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [bulkOpen]);

  const toggleSelected = (paymentId: string) => {
    setSelectedIds((current) =>
      current.includes(paymentId) ? current.filter((id) => id !== paymentId) : [...current, paymentId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : visiblePayments.map((payment) => payment.id));
  };

  const runBulkStatusUpdate = async (status: "PAID" | "FAILED" | "CREATED") => {
    if (bulkLoading || selectedIds.length === 0) return;
    setBulkLoading(true);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIds: selectedIds, status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to update payment status");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { updated?: number };
      setVisiblePayments((current) =>
        current.map((payment) =>
          selectedIds.includes(payment.id) ? { ...payment, status } : payment,
        ),
      );
      setSelectedIds([]);
      toast.success(`Updated ${data.updated ?? selectedIds.length} payments`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBulkLoading(false);
      setBulkOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="px-4 pt-4 sm:px-4">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[1320px] table-fixed text-sm xl:min-w-full">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/80">
                <th className="w-10 px-4 py-3.5 text-left">
                  <SelectableCheckbox checked={allSelected} onChange={toggleAll} ariaLabel="Select all payments" />
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  User
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Breakdown
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Order ID
                </th>
                <th className="px-4 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100">
              {visiblePayments.map((payment) => {
                const checked = selectedSet.has(payment.id);
                const detailHref = payment.href;

                return (
                  <tr
                    key={payment.id}
                    className={cn(
                      "transition-colors",
                      detailHref ? "cursor-pointer hover:bg-rose-50/80" : "",
                      checked && "bg-rose-50/50",
                    )}
                    onClick={detailHref ? () => router.push(detailHref) : undefined}
                    role={detailHref ? "link" : undefined}
                    tabIndex={detailHref ? 0 : undefined}
                    onKeyDown={
                      detailHref
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              router.push(detailHref);
                            }
                          }
                        : undefined
                    }
                  >
                    <td className="px-4 py-4 align-middle">
                      <SelectableCheckbox
                        checked={checked}
                        onChange={() => toggleSelected(payment.id)}
                        ariaLabel={`Select payment ${payment.razorpayOrderId}`}
                      />
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div>
                        <div className="font-semibold text-slate-900">{payment.user.name ?? payment.user.email}</div>
                        <div className="text-sm text-slate-500">{payment.user.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(payment.amount / 100)}</span>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="text-sm text-slate-600">
                        <div>Base: {formatCurrency(payment.baseAmount)}</div>
                        <div>Profile: {formatCurrency(payment.profileAmount)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="truncate text-sm text-slate-500">{payment.razorpayOrderId}</div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="whitespace-nowrap text-sm text-slate-500">{formatDate(payment.createdAt)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-rose-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2 shadow-sm">
            <span className="font-semibold text-slate-900">{selectedCount}</span> Selected
          </span>
          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700"
            >
              Clear selection
            </button>
          ) : null}
        </div>

        <div ref={bulkMenuRef} className="relative">
          <button
            ref={bulkTriggerRef}
            type="button"
            onClick={() => setBulkOpen((value) => !value)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={selectedCount === 0 || bulkLoading}
          >
            Bulk Actions
          </button>

          {bulkOpen && bulkMenuPosition && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={bulkPanelRef}
                  className="fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                  style={{
                    top: `${bulkMenuPosition.top}px`,
                    left: `${bulkMenuPosition.left}px`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => runBulkStatusUpdate("PAID")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    Mark as paid
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkStatusUpdate("FAILED")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <Square className="h-4 w-4 text-amber-500" />
                    Mark as failed
                  </button>
                  <button
                    type="button"
                    onClick={() => runBulkStatusUpdate("CREATED")}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <Square className="h-4 w-4 text-slate-400" />
                    Reset to created
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>
    </div>
  );
}
