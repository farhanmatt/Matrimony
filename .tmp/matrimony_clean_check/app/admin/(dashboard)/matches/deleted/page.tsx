import type { Metadata } from "next";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminListCard from "@/components/admin/AdminListCard";
import EmptyState from "@/components/common/EmptyState";
import { ChevronLeft, ChevronRight, HeartHandshake, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Deleted Matches - Admin",
};

type DeletedMatchRow = {
  id: string;
  profileAName: string;
  profileAGender: string;
  profileACity: string | null;
  profileALocation: string | null;
  profileAState: string | null;
  profileBName: string;
  profileBGender: string;
  profileBCity: string | null;
  profileBLocation: string | null;
  profileBState: string | null;
  unlockCount: number;
  matchCreatedAt: Date;
  deletedAt: Date;
  matchId: string;
};

function fieldValue(value: string | null | undefined) {
  if (!value) return "Not added";
  return value;
}

export default async function DeletedMatchesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const deletedMatches = await prisma.$queryRaw<DeletedMatchRow[]>(Prisma.sql`
    SELECT
      "id",
      "matchId",
      "profileAName",
      "profileAGender",
      "profileACity",
      "profileALocation",
      "profileAState",
      "profileBName",
      "profileBGender",
      "profileBCity",
      "profileBLocation",
      "profileBState",
      "unlockCount",
      "matchCreatedAt",
      "deletedAt"
    FROM "DeletedMatch"
    ORDER BY "deletedAt" DESC
  `);

  const total = deletedMatches.length;

  const rows = deletedMatches.map((match) => {
    const cells: ReactNode[] = [
      <div key="match" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <HeartHandshake className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">{match.profileAName}</div>
          <div className="text-xs text-slate-500">
            {fieldValue(match.profileAGender)} · {fieldValue(match.profileACity ?? match.profileALocation ?? match.profileAState)}
          </div>
        </div>
      </div>,
      <div key="details" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <HeartHandshake className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="font-semibold text-slate-900">{match.profileBName}</div>
          <div className="text-xs text-slate-500">
            {fieldValue(match.profileBGender)} · {fieldValue(match.profileBCity ?? match.profileBLocation ?? match.profileBState)}
          </div>
        </div>
      </div>,
      <span
        key="status"
        className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700"
      >
        Deleted
      </span>,
      <span key="date" className="text-sm text-slate-600">
        {format(match.deletedAt, "dd MMM yyyy, hh:mm a")}
      </span>,
      <span key="action" className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
        Archived
        <Trash2 className="h-3.5 w-3.5" />
      </span>,
    ];

    return {
      id: match.id,
      cells,
    };
  });

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col space-y-6">
      <div>
        <Link
          href="/admin/matches"
          className="mb-4 inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Matches
        </Link>
        <h1 className="text-2xl font-display font-bold text-gray-900">Deleted Matches</h1>
        <p className="mt-1 text-sm text-gray-500">
          Deleted matches are archived here instead of being removed permanently.
        </p>
      </div>

      <div className="border-t border-gray-200" />

      <AdminListCard
        className="min-h-0"
        summaryLeft={<span className="font-medium text-gray-700">{total} total deleted matches</span>}
        summaryRight={
          total > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
              <span className="font-semibold text-slate-900">{total}</span>
              <span>archived</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          ) : null
        }
      >
        {total === 0 ? (
          <div className="flex min-h-full items-center justify-center px-6 py-10">
            <EmptyState
              icon="heart"
              title="No deleted matches yet"
              description="When you remove a match, it will be archived here with the original profile details."
              action={{ label: "Back to Matches", href: "/admin/matches" }}
            />
          </div>
        ) : (
          <div className="h-full min-h-0 overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90">
                  <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    User A
                  </th>
                  <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    User B
                  </th>
                  <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    Status
                  </th>
                  <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    Deleted At
                  </th>
                  <th className="px-2 py-3 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                    Archive
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                    {row.cells.map((cell, index) => (
                      <td key={`${row.id}-${index}`} className="px-2 py-4 align-middle">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminListCard>
    </div>
  );
}
