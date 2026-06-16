import type { Metadata } from "next";
import type { ReactNode } from "react";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminPageSizeSelector from "@/components/admin/AdminPageSizeSelector";
import AdminMatchColumnSelector, {
  type AdminMatchColumnKey,
} from "@/components/admin/AdminMatchColumnSelector";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import AdminDeletedMatchActions from "@/components/admin/AdminDeletedMatchActions";
import EmptyState from "@/components/common/EmptyState";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getInitials } from "@/lib/utils/helpers";

export const metadata: Metadata = {
  title: "Deleted Matches - Admin",
};

const MATCH_COLUMNS_COOKIE = "admin_matches_columns";

const MATCH_COLUMN_KEYS = ["match", "details", "id", "status", "date", "action"] as const;
const DEFAULT_MATCH_COLUMN_KEYS: AdminMatchColumnKey[] = [
  "match",
  "details",
  "id",
  "status",
  "date",
  "action",
];

function fieldValue(value: string | null | undefined) {
  if (!value) return "Not added";
  return value;
}

function parseMatchCodeSearch(raw: string) {
  const match = raw.trim().match(/^MAT-(\d{4})-(\d{6})$/i);
  if (!match) return null;

  return {
    year: Number(match[1]),
    sequence: Number(match[2]),
  };
}

function parseMatchColumns(raw: string | undefined): AdminMatchColumnKey[] {
  if (!raw) return [...DEFAULT_MATCH_COLUMN_KEYS];

  const selectedSet = new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is AdminMatchColumnKey =>
        (MATCH_COLUMN_KEYS as readonly string[]).includes(value),
      ),
  );

  const selected = MATCH_COLUMN_KEYS.filter((value): value is AdminMatchColumnKey =>
    selectedSet.has(value),
  );

  return selected.length > 0 ? selected : [...DEFAULT_MATCH_COLUMN_KEYS];
}

function buildPageHref({
  page,
  search,
  columns,
  limit,
}: {
  page: number;
  search: string;
  columns: AdminMatchColumnKey[];
  limit: number;
}) {
  const params = new URLSearchParams();

  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  params.set("columns", columns.join(","));
  params.set("limit", String(limit));

  return params.toString() ? `/admin/matches/deleted?${params.toString()}` : "/admin/matches/deleted";
}

export default async function DeletedMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
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
  const limit = [10, 20, 50].includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const cookieStore = await cookies();
  const storedColumns = cookieStore.get(MATCH_COLUMNS_COOKIE)?.value;
  const selectedColumns = parseMatchColumns(sp.columns ?? sp.column ?? storedColumns);
  const visibleColumns = selectedColumns.length > 0 ? selectedColumns : DEFAULT_MATCH_COLUMN_KEYS;

  try {
    const [liveMatchSources, deletedMatchSources] = await Promise.all([
      prisma.match.findMany({
        select: {
          id: true,
          createdAt: true,
        },
      }),
      prisma.deletedMatch.findMany({
        select: {
          matchId: true,
          matchCreatedAt: true,
        },
      }),
    ]);

    const allMatchCodeSource = [
      ...liveMatchSources,
      ...deletedMatchSources.map((dm) => ({
        id: dm.matchId,
        createdAt: dm.matchCreatedAt,
      })),
    ];

    allMatchCodeSource.sort((a, b) => {
      const timeDiff = a.createdAt.getTime() - b.createdAt.getTime();
      return timeDiff !== 0 ? timeDiff : a.id.localeCompare(b.id);
    });

    const yearCounters = new Map<number, number>();
    const matchCodeById = new Map<string, string>();

    for (const match of allMatchCodeSource) {
      const year = match.createdAt.getFullYear();
      const nextSequence = (yearCounters.get(year) ?? 0) + 1;
      yearCounters.set(year, nextSequence);
      matchCodeById.set(match.id, `MAT-${year}-${String(nextSequence).padStart(6, "0")}`);
    }

    const matchCodeSearch = search ? parseMatchCodeSearch(search) : null;
    const matchIdSearch =
      matchCodeSearch &&
      allMatchCodeSource.find((match) => {
        const expectedCode = `MAT-${matchCodeSearch.year}-${String(matchCodeSearch.sequence).padStart(6, "0")}`;
        return matchCodeById.get(match.id) === expectedCode;
      })?.id;

    const where: Prisma.DeletedMatchWhereInput = {};
    const andConditions: Prisma.DeletedMatchWhereInput[] = [];

    if (search && !matchCodeSearch) {
      andConditions.push({
        OR: [
          { profileAName: { contains: search, mode: "insensitive" as const } },
          { profileBName: { contains: search, mode: "insensitive" as const } },
          { profileACity: { contains: search, mode: "insensitive" as const } },
          { profileBCity: { contains: search, mode: "insensitive" as const } },
          { profileALocation: { contains: search, mode: "insensitive" as const } },
          { profileBLocation: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }

    if (matchCodeSearch) {
      andConditions.push({
        matchId: matchIdSearch ?? "__no_match__",
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [deletedMatches, total] = await Promise.all([
      prisma.deletedMatch.findMany({
        where,
        orderBy: { deletedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deletedMatch.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const profileIds = new Set<string>();
    deletedMatches.forEach((m) => {
      profileIds.add(m.profileAId);
      profileIds.add(m.profileBId);
    });

    const profiles = await prisma.profile.findMany({
      where: { id: { in: Array.from(profileIds) } },
      select: {
        id: true,
        profileImage: true,
        photos: {
          where: { isPrimary: true },
          take: 1,
          select: { url: true },
        },
      },
    });

    const profileMap = new Map<string, { profileImage: string | null; photoUrl: string | null }>();
    profiles.forEach((p) => {
      profileMap.set(p.id, {
        profileImage: p.profileImage,
        photoUrl: p.photos[0]?.url ?? null,
      });
    });

    const rows = deletedMatches.map((match) => {
      const pA = profileMap.get(match.profileAId);
      const imageA = pA?.profileImage ?? pA?.photoUrl ?? null;

      const pB = profileMap.get(match.profileBId);
      const imageB = pB?.profileImage ?? pB?.photoUrl ?? null;

      const formattedMatchId = matchCodeById.get(match.matchId) ?? match.matchId;

      const cells: Record<AdminMatchColumnKey, ReactNode> = {
        id: (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {formattedMatchId}
          </span>
        ),
        match: (
          <div className="flex items-center gap-3">
            {imageA ? (
              <AdminPreviewableImage
                src={imageA}
                alt={match.profileAName}
                className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100 cursor-zoom-in"
                imageClassName="object-cover object-[50%_15%]"
                sizes="40px"
              />
            ) : (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[10px] font-semibold text-slate-500">
                  {getInitials(match.profileAName)}
                </div>
              </div>
            )}
            <div>
              <div className="font-semibold text-slate-900">{match.profileAName}</div>
              <div className="text-xs text-slate-500">
                {fieldValue(match.profileAGender)} ·{" "}
                {fieldValue(match.profileACity ?? match.profileALocation ?? match.profileAState)}
              </div>
            </div>
          </div>
        ),
        details: (
          <div className="flex items-center gap-3">
            {imageB ? (
              <AdminPreviewableImage
                src={imageB}
                alt={match.profileBName}
                className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100 cursor-zoom-in"
                imageClassName="object-cover object-[50%_15%]"
                sizes="40px"
              />
            ) : (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[10px] font-semibold text-slate-500">
                  {getInitials(match.profileBName)}
                </div>
              </div>
            )}
            <div>
              <div className="font-semibold text-slate-900">{match.profileBName}</div>
              <div className="text-xs text-slate-500">
                {fieldValue(match.profileBGender)} ·{" "}
                {fieldValue(match.profileBCity ?? match.profileBLocation ?? match.profileBState)}
              </div>
            </div>
          </div>
        ),
        status: (
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-rose-50 text-rose-700">
            Deleted
          </span>
        ),
        date: (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-700">
              {format(match.deletedAt, "dd MMM yyyy")}
            </span>
            <span className="text-xs text-slate-400">
              {format(match.deletedAt, "hh:mm a")}
            </span>
          </div>
        ),
        action: (
          <AdminDeletedMatchActions
            deletedMatchId={match.id}
            profileAName={match.profileAName}
            profileBName={match.profileBName}
          />
        ),
      };

      return {
        id: match.id,
        cells,
      };
    });

    const columnLabels: Record<AdminMatchColumnKey, string> = {
      id: "Match ID",
      match: "User A",
      details: "User B",
      status: "Status",
      date: "Deleted At",
      action: "Actions",
    };

    const columnWidths: Record<AdminMatchColumnKey, string> = {
      id: "18%",
      match: "24%",
      details: "22%",
      status: "10%",
      date: "12%",
      action: "14%",
    };

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
            Deleted matches are archived here. You can restore or permanently remove them.
          </p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminListCard
          className="min-h-0"
          toolbar={
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <AdminSearchInput placeholder="Search by name or location..." />

              <div className="flex items-center gap-3 xl:ml-auto">
                <AdminMatchColumnSelector selectedColumns={visibleColumns} />
              </div>
            </div>
          }
          summaryLeft={<span className="font-medium text-gray-700">{total} total deleted matches</span>}
          summaryRight={
            totalPages > 0 ? (
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <AdminPageSizeSelector value={limit} />

                <div className="flex items-center gap-2">
                  <a
                    href={buildPageHref({
                      page: Math.max(1, page - 1),
                      search,
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
          {total === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center px-6 py-10">
              <EmptyState
                icon="heart"
                title="No deleted matches found"
                description={
                  search
                    ? "Try adjusting your search keywords to find the matching deleted records."
                    : "When you delete a match, it will be archived here with the original profile details."
                }
                action={search ? { label: "Clear search", href: "/admin/matches/deleted" } : undefined}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-x-auto">
              <table className="w-full min-w-[1240px] table-fixed text-sm xl:min-w-full">
                <colgroup>
                  {visibleColumns.map((column) => (
                    <col key={column} style={{ width: columnWidths[column] }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-rose-100 bg-rose-50/80">
                    {visibleColumns.map((column) => (
                      <th
                        key={column}
                        className="px-4 py-3.5 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                      >
                        {columnLabels[column]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-rose-50/60">
                      {visibleColumns.map((column) => (
                        <td key={`${row.id}-${column}`} className="px-4 py-4 align-middle">
                          {row.cells[column]}
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
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Deleted Matches</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load deleted matches right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Matches unavailable"
          description="We couldn't reach the database to load the deleted match list."
        />
      </div>
    );
  }
}
