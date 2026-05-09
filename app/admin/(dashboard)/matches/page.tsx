import type { Metadata } from "next";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMatchesFromMutualLikes } from "@/lib/utils/matching";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminPageSizeSelector from "@/components/admin/AdminPageSizeSelector";
import AdminMatchFilters from "@/components/admin/AdminMatchFilters";
import AdminMatchColumnSelector, {
  type AdminMatchColumnKey,
} from "@/components/admin/AdminMatchColumnSelector";
import AdminMatchStatusQuickLinks from "@/components/admin/AdminMatchStatusQuickLinks";
import AdminMatchesTable from "@/components/admin/AdminMatchesTable";
import { HeartHandshake, ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Match Management - Admin",
};

const MATCH_COLUMN_KEYS = ["match", "details", "status", "date", "action"] as const;
const DEFAULT_MATCH_COLUMN_KEYS: AdminMatchColumnKey[] = [
  "match",
  "details",
  "status",
  "date",
  "action",
];

type MatchRow = {
  id: string;
  profileA: {
    id: string;
    fullName: string;
    gender: string;
    city: string | null;
    location: string | null;
    state: string | null;
  };
  profileB: {
    id: string;
    fullName: string;
    gender: string;
    city: string | null;
    location: string | null;
    state: string | null;
  };
  unlocks: { id: string }[];
  createdAt: Date;
};

function fieldValue(value: string | null | undefined) {
  if (!value) return "Not added";
  return value;
}

function parseMatchColumns(raw: string | undefined): AdminMatchColumnKey[] {
  if (!raw) return [...DEFAULT_MATCH_COLUMN_KEYS];

  const selected = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is AdminMatchColumnKey =>
      (MATCH_COLUMN_KEYS as readonly string[]).includes(value)
    );

  return selected.length > 0 ? selected : [...DEFAULT_MATCH_COLUMN_KEYS];
}

function buildPageHref({
  page,
  search,
  unlockStatus,
  dateFrom,
  dateTo,
  columns,
  limit,
}: {
  page: number;
  search: string;
  unlockStatus: string;
  dateFrom: string;
  dateTo: string;
  columns: AdminMatchColumnKey[];
  limit: number;
}) {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  if (unlockStatus) params.set("unlockStatus", unlockStatus);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  params.set("columns", columns.join(","));
  params.set("limit", String(limit));

  return params.toString() ? `/admin/matches?${params.toString()}` : "/admin/matches";
}

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    unlockStatus?: string;
    dateFrom?: string;
    dateTo?: string;
    columns?: string;
    column?: string;
    limit?: string;
  }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);
  const search = sp.search ?? "";
  const unlockStatus = sp.unlockStatus ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo = sp.dateTo ?? "";
  const limit = [10, 20, 50].includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const selectedColumns = parseMatchColumns(sp.columns ?? sp.column);
  const visibleColumns = selectedColumns.length > 0 ? selectedColumns : DEFAULT_MATCH_COLUMN_KEYS;
  const showBackToMatches = unlockStatus === "locked" || unlockStatus === "unlocked";

  const where: Prisma.MatchWhereInput = {};
  const andConditions: Prisma.MatchWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { profileA: { is: { fullName: { contains: search, mode: "insensitive" as const } } } },
        { profileB: { is: { fullName: { contains: search, mode: "insensitive" as const } } } },
        { profileA: { is: { city: { contains: search, mode: "insensitive" as const } } } },
        { profileB: { is: { city: { contains: search, mode: "insensitive" as const } } } },
        { profileA: { is: { location: { contains: search, mode: "insensitive" as const } } } },
        { profileB: { is: { location: { contains: search, mode: "insensitive" as const } } } },
      ],
    });
  }

  if (unlockStatus === "unlocked") {
    andConditions.push({ unlocks: { some: {} } });
  }

  if (unlockStatus === "locked") {
    andConditions.push({ unlocks: { none: {} } });
  }

  if (dateFrom || dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    andConditions.push({ createdAt: dateFilter });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  try {
    await syncMatchesFromMutualLikes();

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          profileA: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              city: true,
              location: true,
              state: true,
            },
          },
          profileB: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              city: true,
              location: true,
              state: true,
            },
          },
          unlocks: {
            select: { id: true },
          },
        },
      }),
      prisma.match.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const listReturnHref = buildPageHref({
      page,
      search,
      unlockStatus,
      dateFrom,
      dateTo,
      columns: visibleColumns,
      limit,
    });

    const rows = matches.map((match) => {
    const row = match as MatchRow;
    const href = `/admin/matches/${row.id}?returnTo=${encodeURIComponent(listReturnHref)}`;

    const cells: ReactNode[] = visibleColumns.map((column) => {
      if (column === "match") {
        return (
          <div key={column} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <HeartHandshake className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {row.profileA.fullName}
              </div>
              <div className="text-xs text-slate-500">
                {fieldValue(row.profileA.gender)} · {fieldValue(row.profileA.city ?? row.profileA.location ?? row.profileA.state)}
              </div>
            </div>
          </div>
        );
      }

      if (column === "details") {
        return (
          <div key={column} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <HeartHandshake className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {row.profileB.fullName}
              </div>
              <div className="text-xs text-slate-500">
                {fieldValue(row.profileB.gender)} · {fieldValue(row.profileB.city ?? row.profileB.location ?? row.profileB.state)}
              </div>
            </div>
          </div>
        );
      }

      if (column === "status") {
        return (
          <span
            key={column}
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              row.unlocks.length > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {row.unlocks.length > 0 ? "Unlocked" : "No unlocks"}
          </span>
        );
      }

      if (column === "action") {
        return (
          <span key={column} className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            View match details
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        );
      }

      return <span key={column}>{format(row.createdAt, "dd MMM yyyy, hh:mm a")}</span>;
    });

    return { id: row.id, href, cells };
  });

    const columnLabels: Record<AdminMatchColumnKey, string> = {
    match: "User A",
    details: "User B",
    status: "Status",
    date: "Match Date",
    action: "Action",
  };

    const columnWidths: Record<AdminMatchColumnKey, string> = {
    match: "30%",
    details: "28%",
    status: "14%",
    date: "16%",
    action: "12%",
  };

    return (
      <div className="flex min-h-[calc(100vh-8rem)] flex-col space-y-6">
        <div>
          {showBackToMatches ? (
            <Link
              href="/admin/matches"
              className="mb-4 inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Matches
            </Link>
          ) : null}
          <h1 className="text-2xl font-display font-bold text-gray-900">Match Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Mutual matches list with quick access to both profiles and match actions.
          </p>
        </div>

      <AdminListCard
          className="min-h-0"
          toolbar={
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <AdminSearchInput placeholder="Search by name or location..." />

              <div className="flex items-center gap-3 xl:ml-auto">
                <AdminMatchFilters />
                <AdminMatchColumnSelector selectedColumns={visibleColumns} />
              </div>
            </div>
          }
          summaryLeft={<span className="font-medium text-gray-700">{total} total matches</span>}
          summaryRight={
            totalPages > 0 ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <AdminMatchStatusQuickLinks
                  items={[]}
                  deletedMatchesHref="/admin/matches/deleted"
                />

                <AdminPageSizeSelector value={limit} />

                <div className="flex items-center gap-2">
                  <a
                    href={buildPageHref({
                      page: Math.max(1, page - 1),
                      search,
                      unlockStatus,
                      dateFrom,
                      dateTo,
                      columns: visibleColumns,
                      limit,
                    })}
                    aria-label="Previous page"
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors ${
                      page === 1 ? "pointer-events-none opacity-40" : "hover:border-rose-300 hover:text-rose-500"
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </a>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700">
                    {page}
                  </div>

                  <span className="text-sm text-gray-500">of {totalPages || 1}</span>

                  <a
                    href={buildPageHref({
                      page: Math.min(totalPages || 1, page + 1),
                      search,
                      unlockStatus,
                      dateFrom,
                      dateTo,
                      columns: visibleColumns,
                      limit,
                    })}
                    aria-label="Next page"
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors ${
                      page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-rose-300 hover:text-rose-500"
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ) : null
          }
        >
          <AdminMatchesTable
            columns={visibleColumns.map((column) => ({
              key: column,
              label: columnLabels[column],
              width: columnWidths[column],
            }))}
            rows={rows}
          />
        </AdminListCard>
      </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Match Management</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load matches right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Matches unavailable"
          description="We couldn't reach the database to load the match list."
        />
      </div>
    );
  }
}

