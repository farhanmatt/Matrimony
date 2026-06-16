"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, CheckSquare, Copy, Eye, MoreVertical, Trash2, Square, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/helpers";

type TableColumn = {
  key: string;
  label: string;
  width: string;
};

type TableRow = {
  id: string;
  displayId?: string;
  href: string;
  cells: ReactNode[];
};

interface AdminMatchesTableProps {
  columns: TableColumn[];
  rows: TableRow[];
  listFooter?: ReactNode;
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
      className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-rose-300 bg-white text-rose-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 hover:border-rose-500"
      aria-label={ariaLabel}
    >
      {checked ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

export default function AdminMatchesTable({ columns, rows, listFooter }: AdminMatchesTableProps) {
  const router = useRouter();
  const [visibleRows, setVisibleRows] = useState(rows);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMenuPosition, setBulkMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [openActionRowId, setOpenActionRowId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement | null>(null);
  const bulkTriggerRef = useRef<HTMLButtonElement | null>(null);
  const bulkPanelRef = useRef<HTMLDivElement | null>(null);
  const actionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(() => async () => {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const allSelected = visibleRows.length > 0 && selectedCount === visibleRows.length;
  const menuHeight = 156;
  const menuWidth = 224;

  useEffect(() => {
    setVisibleRows(rows);
  }, [rows]);

  useEffect(() => {
    setSelectedIds([]);
  }, [rows]);

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
      const menuHeight = 156;
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

  useEffect(() => {
    if (!openActionRowId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        actionMenuRef.current &&
        !actionMenuRef.current.contains(target) &&
        actionTriggerRef.current &&
        !actionTriggerRef.current.contains(target)
      ) {
        setOpenActionRowId(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionRowId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openActionRowId]);

  useEffect(() => {
    if (!openActionRowId) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = actionTriggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);

      setMenuPosition({
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
  }, [openActionRowId]);

  const toggleSelected = (matchId: string) => {
    setSelectedIds((current) =>
      current.includes(matchId) ? current.filter((id) => id !== matchId) : [...current, matchId],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : visibleRows.map((row) => row.id));
  };

  const runBulkDelete = async () => {
    if (bulkLoading || selectedIds.length === 0) return;

    setConfirmTitle(`Delete ${selectedIds.length} selected match${selectedIds.length === 1 ? "" : "es"}?`);
    setConfirmMessage("Are you sure you want to delete the selected matches? This action cannot be undone.");
    setConfirmAction(() => async () => {
      setBulkLoading(true);
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/admin/matches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchIds: selectedIds }),
        });

        if (!res.ok) {
          const responseBody = await res.text();
          console.error("Admin matches bulk delete API failed.", {
            status: res.status,
            statusText: res.statusText,
            body: responseBody,
          });
          toast.error("Failed to delete matches");
          return;
        }

        const data = (await res.json().catch(() => ({}))) as { deleted?: number };
        setVisibleRows((current) => current.filter((row) => !selectedIds.includes(row.id)));
        setSelectedIds([]);
        toast.success(`Deleted ${data.deleted ?? selectedIds.length} matches`);
        router.refresh();
      } catch (error) {
        console.error("Admin matches bulk delete request failed.", error);
        toast.error("Something went wrong");
      } finally {
        setBulkLoading(false);
        setBulkOpen(false);
        setIsSubmitting(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleCopyMatchId = async (matchId: string) => {
    try {
      await navigator.clipboard.writeText(matchId);
      toast.success("Match ID copied");
    } catch {
      toast.error("Could not copy match ID");
    } finally {
      setOpenActionRowId(null);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    setConfirmTitle("Delete this match?");
    setConfirmMessage("Are you sure you want to delete this match? This action cannot be undone.");
    setConfirmAction(() => async () => {
      setIsSubmitting(true);
      try {
        const res = await fetch("/api/admin/matches", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchIds: [matchId] }),
        });

        if (!res.ok) {
          const responseBody = await res.text();
          console.error("Admin match delete API failed.", {
            status: res.status,
            statusText: res.statusText,
            body: responseBody,
          });
          toast.error("Failed to delete match");
          return;
        }

        toast.success("Match deleted");
        setVisibleRows((current) => current.filter((row) => row.id !== matchId));
        router.refresh();
        router.push("/admin/matches/deleted");
      } catch (error) {
        console.error("Admin match delete request failed.", error);
        toast.error("Something went wrong");
      } finally {
        setIsSubmitting(false);
        setOpenActionRowId(null);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full min-w-[1240px] table-fixed text-sm xl:min-w-full">
            <colgroup>
              <col style={{ width: "4%" }} />
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-rose-100 bg-rose-50/95 backdrop-blur">
                <th className="sticky left-0 z-20 bg-rose-50/95 px-4 py-3.5 text-left">
                  <SelectableCheckbox checked={allSelected} onChange={toggleAll} ariaLabel="Select all matches" />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="bg-rose-50/95 px-4 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 bg-white">
              {visibleRows.map((row, rowIndex) => {
                const checked = selectedSet.has(row.id);
                const revealStyle = {
                  animationDelay: `${180 + Math.min(rowIndex, 8) * 38}ms`,
                };

                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "group/row ui-enter-up cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-rose-50/80",
                      checked && "bg-rose-50/50",
                    )}
                    style={revealStyle}
                    onClick={() => router.push(row.href)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(row.href);
                      }
                    }}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-4 align-middle transition-colors duration-300">
                      <SelectableCheckbox
                        checked={checked}
                        onChange={() => toggleSelected(row.id)}
                        ariaLabel={`Select match ${row.id}`}
                      />
                    </td>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.id}-${columns[index]?.key ?? index}`}
                        className={`px-4 py-4 align-middle transition-colors duration-300 ${columns[index]?.key === "action" ? "relative overflow-visible" : ""}`}
                      >
                        {columns[index]?.key === "action" ? (
                          <div className="relative flex justify-center">
                            <button
                              ref={openActionRowId === row.id ? actionTriggerRef : null}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenActionRowId((current) => (current === row.id ? null : row.id));
                              }}
                              className="ui-link-shift inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-100 bg-white text-slate-500 shadow-sm transition-all duration-300 hover:border-rose-200 hover:text-rose-600 hover:shadow-md"
                              aria-label={`Open actions for ${row.id}`}
                              aria-haspopup="menu"
                              aria-expanded={openActionRowId === row.id}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {openActionRowId === row.id && menuPosition && typeof document !== "undefined"
                              ? createPortal(
                                  <div
                                    ref={actionMenuRef}
                                    className="ui-modal-pop fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                                    style={{
                                      top: `${menuPosition.top}px`,
                                      left: `${menuPosition.left}px`,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        router.push(row.href);
                                        setOpenActionRowId(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                                    >
                                      <Eye className="h-4 w-4 text-rose-500" />
                                      View match details
                                    </button>
                                    <button
                                      type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCopyMatchId(row.displayId ?? row.id);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                            >
                                      <Copy className="h-4 w-4 text-slate-500" />
                                      Copy Match ID
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeleteMatch(row.id);
                                      }}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-4 w-4 text-rose-500" />
                                      Delete match
                                    </button>
                                  </div>,
                                  document.body,
                                )
                              : null}
                          </div>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {listFooter ? (
          <div className="mt-4 border-t border-rose-100 bg-rose-50/30 px-4 py-3">
            {listFooter}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 flex flex-col gap-3 border-t border-rose-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
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
            className="ui-link-shift inline-flex h-11 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:border-rose-200 hover:bg-rose-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={selectedCount === 0 || bulkLoading}
          >
            Bulk Actions
          </button>

          {bulkOpen && bulkMenuPosition && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={bulkPanelRef}
                  className="ui-modal-pop fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
                  style={{
                    top: `${bulkMenuPosition.top}px`,
                    left: `${bulkMenuPosition.left}px`,
                  }}
                >
                  <button
                    type="button"
                    onClick={runBulkDelete}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                    Delete selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <Square className="h-4 w-4 text-slate-400" />
                    Clear selection
                  </button>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                  >
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    {allSelected ? "Unselect all" : "Select all"}
                  </button>
                </div>,
                document.body,
              )
            : null}
        </div>
      </div>

      {confirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]"
              onClick={(event) => {
                if (event.target === event.currentTarget && !isSubmitting) {
                  setConfirmOpen(false);
                }
              }}
            >
              <div className="relative w-full max-w-md rounded-[28px] border border-rose-100 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-7">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                  aria-label="Close dialog"
                  disabled={isSubmitting}
                >
                  <X className="h-4.5 w-4.5" />
                </button>

                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-[1.4rem] font-bold text-slate-900">
                    {confirmTitle}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-slate-500">
                    {confirmMessage}
                  </p>
                </div>

                <div className="flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-[16px] border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAction}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4.5 w-4.5" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
