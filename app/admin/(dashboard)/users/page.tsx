import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminUserFieldSelector, {
  type AdminUserColumnKey,
} from "@/components/admin/AdminUserFieldSelector";
import AdminPageSizeSelector from "@/components/admin/AdminPageSizeSelector";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminUserFilters from "@/components/admin/AdminUserFilters";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, getInitials } from "@/lib/utils/helpers";
import { ChevronLeft, ChevronRight, Heart, Phone } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = { title: "Manage Users — Admin" };

const USER_COLUMNS_COOKIE = "admin_users_columns";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    maritalStatus: string;
    phone: string | null;
    status: string;
    religion: string | null;
    caste: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    profileImage: string | null;
  } | null;
};

function formatAge(dateOfBirth: Date) {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  const dayDiff = now.getDate() - dateOfBirth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

function formatMaritalStatus(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    profileStatus?: string;
    hasProfile?: string;
    joinedFrom?: string;
    joinedTo?: string;
    column?: string;
    columns?: string;
    limit?: string;
  }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);
  const search = sp.search ?? "";
  const profileStatus = sp.profileStatus ?? "";
  const hasProfile = sp.hasProfile ?? "";
  const joinedFrom = sp.joinedFrom ?? "";
  const joinedTo = sp.joinedTo ?? "";
  const limit = [10, 20, 50].includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const userColumnKeys = ["user", "details", "profile", "status", "joined"] as const;
  type UserColumnKey = (typeof userColumnKeys)[number];
  const cookieStore = await cookies();
  const storedColumns = cookieStore.get(USER_COLUMNS_COOKIE)?.value;

  const parseSelectedColumns = (rawColumns?: string, rawColumn?: string): UserColumnKey[] => {
    const source = (rawColumns ?? "").trim() || (rawColumn ?? "").trim() || (storedColumns ?? "").trim();

    if (!source || source === "all") {
      return [...userColumnKeys];
    }

    const keys = source
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is UserColumnKey => userColumnKeys.includes(value as UserColumnKey));

    const unique = Array.from(new Set(keys));
    return unique.length === userColumnKeys.length ? [...userColumnKeys] : unique;
  };

  const selectedColumns = parseSelectedColumns(sp.columns, sp.column);
  const selectedColumnsSet = new Set<UserColumnKey>(selectedColumns);
  const hasCustomColumns = selectedColumns.length > 0 && selectedColumns.length < userColumnKeys.length;

  const where: Prisma.UserWhereInput = {
    role: "USER" as const,
  };

  const andConditions: Prisma.UserWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        {
          profile: {
            is: {
              fullName: { contains: search, mode: "insensitive" as const },
            },
          },
        },
      ],
    });
  }

  if (profileStatus) {
    andConditions.push({
      profile: {
        is: {
          status: profileStatus as never,
        },
      },
    });
  }

  if (hasProfile === "with") {
    andConditions.push({ profile: { isNot: null } });
  }

  if (hasProfile === "without") {
    andConditions.push({ profile: null });
  }

  if (joinedFrom || joinedTo) {
    const joinedFilter: Prisma.DateTimeFilter = {};

    if (joinedFrom) {
      joinedFilter.gte = new Date(joinedFrom);
    }

    if (joinedTo) {
      const end = new Date(joinedTo);
      end.setHours(23, 59, 59, 999);
      joinedFilter.lte = end;
    }

    andConditions.push({ createdAt: joinedFilter });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  try {
    const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
            gender: true,
            dateOfBirth: true,
            maritalStatus: true,
            status: true,
            religion: true,
            caste: true,
            location: true,
            city: true,
            state: true,
            profileImage: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

  const userColumns: Array<{
    key: UserColumnKey;
    label: string;
    render: (user: UserRow) => ReactNode;
  }> = [
    {
      key: "user",
      label: "User",
      render: (user) => (
        <div className="flex items-start gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100">
            {user.profile?.profileImage ? (
              <Image
                src={user.profile.profileImage}
                alt={user.profile.fullName ?? user.name ?? user.email}
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[11px] font-semibold text-slate-500">
                {getInitials(user.profile?.fullName ?? user.name ?? user.email)}
              </div>
            )}
          </div>

          <div className="min-w-0 space-y-0.5 pt-0.5">
            <div className="whitespace-nowrap text-[15px] font-semibold leading-tight text-slate-900">
              {user.profile?.fullName ?? user.name ?? user.email}
            </div>
            <div className="whitespace-nowrap text-[11px] leading-tight text-slate-500">{user.email}</div>
            {user.profile?.phone ? (
              <div className="flex items-center gap-1 whitespace-nowrap text-[11px] leading-tight text-slate-500">
                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                <span>{user.profile.phone}</span>
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "details",
      label: "Details",
      render: (user) =>
        user.profile ? (
          <div className="space-y-1 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                <Heart className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <div className="truncate leading-tight text-[13px] font-medium text-slate-700">
                  Marital Status: {formatMaritalStatus(user.profile.maritalStatus)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-slate-300">-</span>
        ),
    },
    {
      key: "profile",
      label: "Profile",
      render: (user) =>
        user.profile ? (
          <div className="space-y-0.5">
            <div className="truncate text-sm font-semibold text-slate-900">{user.profile.fullName}</div>
            <div className="truncate text-[11px] text-slate-500">{user.profile.gender}</div>
            <div className="truncate text-[11px] text-slate-500">{formatAge(user.profile.dateOfBirth)} years</div>
          </div>
        ) : (
          <div className="text-sm italic text-slate-300">No profile</div>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (user) =>
        user.profile ? <StatusBadge status={user.profile.status} /> : <span className="text-slate-300">-</span>,
    },
    {
      key: "joined",
      label: "Joined",
      render: (user) => (
        <div className="space-y-0.5 whitespace-nowrap text-sm text-slate-500">
          <div>{format(user.createdAt, "dd MMM yyyy")}</div>
          <div>{format(user.createdAt, "hh:mm a")}</div>
        </div>
      ),
    },
  ];

  const visibleColumns =
    !hasCustomColumns
      ? userColumns
      : userColumns.filter((column) => selectedColumnsSet.has(column.key));

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) params.set("search", search);
    if (profileStatus) params.set("profileStatus", profileStatus);
    if (hasProfile) params.set("hasProfile", hasProfile);
    if (joinedFrom) params.set("joinedFrom", joinedFrom);
    if (joinedTo) params.set("joinedTo", joinedTo);
    params.set("columns", selectedColumns.join(","));
    params.delete("column");
    params.set("limit", String(limit));
    return `?${params.toString()}`;
  };

  const paginationFooter =
    totalPages > 0 ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-slate-700">{total} total users</span>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <AdminPageSizeSelector value={limit} />

          <div className="flex items-center gap-2">
            <a
              href={buildPageHref(Math.max(1, page - 1))}
              aria-label="Previous page"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors ${
                page === 1
                  ? "pointer-events-none opacity-40"
                  : "hover:border-rose-300 hover:text-rose-500"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </a>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700">
              {page}
            </div>

            <span className="text-sm text-gray-500">of {totalPages || 1}</span>

            <a
              href={buildPageHref(Math.min(totalPages || 1, page + 1))}
              aria-label="Next page"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-colors ${
                page >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:border-rose-300 hover:text-rose-500"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    ) : null;

    return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-6 overflow-hidden sm:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="shrink-0">
        <h1 className="text-2xl font-display font-bold text-gray-900">Manage Users</h1>
        <p className="mt-1 text-sm text-gray-500">{total} total users</p>
      </div>

      <div className="shrink-0 border-t border-gray-200" />

      <AdminListCard
        className="flex-1 min-h-0"
        bodyClassName="flex min-h-0 flex-col overflow-hidden"
        toolbar={
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <AdminSearchInput placeholder="Search by name or email..." />

            <div className="flex items-center gap-3 xl:ml-auto">
              <AdminUserFilters />
              <AdminUserFieldSelector selectedColumns={selectedColumns} />
            </div>
          </div>
        }
      >
        {!hasCustomColumns ? (
          <AdminUsersTable
            users={users.map((user) => {
              const row = user as unknown as UserRow;
              return {
                id: row.id,
                name: row.name,
                email: row.email,
                createdAt: row.createdAt,
                profile: row.profile
                  ? {
                      id: row.profile.id,
                      fullName: row.profile.fullName,
                      gender: row.profile.gender,
                      dateOfBirth: row.profile.dateOfBirth,
                      maritalStatus: row.profile.maritalStatus,
                      phone: row.profile.phone,
                      status: row.profile.status,
                      religion: row.profile.religion,
                      caste: row.profile.caste,
                      location: row.profile.location,
                      city: row.profile.city,
                      state: row.profile.state,
                      profileImage: row.profile.profileImage,
                    }
                  : null,
              };
            })}
            listFooter={paginationFooter}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full min-w-max table-auto text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-slate-100 bg-slate-50/90">
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap bg-slate-50/95 px-6 py-4 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700 backdrop-blur"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const row = user as unknown as UserRow;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                      {visibleColumns.map((column) => (
                        <td key={`${row.id}-${column.key}`} className="px-6 py-4 align-middle">
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {paginationFooter ? (
              <div className="border-t border-rose-100 bg-rose-50/30 px-4 py-3">
                {paginationFooter}
              </div>
            ) : null}
            </div>

            {users.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No users found.</div>
            ) : null}
          </div>
        )}
      </AdminListCard>
    </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Manage Users</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load users right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Users unavailable"
          description="We couldn't reach the database to load the users list."
        />
      </div>
    );
  }
}
