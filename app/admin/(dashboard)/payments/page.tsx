import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminPageSizeSelector from "@/components/admin/AdminPageSizeSelector";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminPaymentFilters from "@/components/admin/AdminPaymentFilters";
import AdminPaymentsTable from "@/components/admin/AdminPaymentsTable";
import AdminPaymentColumnSelector from "@/components/admin/AdminPaymentColumnSelector";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils/helpers";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Payments â€” Admin" };

type PaymentRow = {
  id: string;
  href: string;
  amount: number;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  status: string;
  razorpayOrderId: string;
  createdAt: Date;
  user: { name: string | null; email: string };
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    amountMin?: string;
    amountMax?: string;
    dateFrom?: string;
    dateTo?: string;
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
  const status = sp.status ?? "";
  const amountMin = sp.amountMin ?? "";
  const amountMax = sp.amountMax ?? "";
  const dateFrom = sp.dateFrom ?? "";
  const dateTo = sp.dateTo ?? "";
  const limit = [10, 20, 50].includes(Number(sp.limit)) ? Number(sp.limit) : 10;
  const paymentColumnKeys = ["user", "amount", "breakdown", "status", "orderId", "date"] as const;
  type PaymentColumnKey = (typeof paymentColumnKeys)[number];

  const parseSelectedColumns = (rawColumns?: string, rawColumn?: string): PaymentColumnKey[] => {
    const source = (rawColumns ?? "").trim() || (rawColumn ?? "").trim();

    if (!source || source === "all") {
      return [...paymentColumnKeys];
    }

    const keys = source
      .split(",")
      .map((value) => value.trim())
      .filter((value): value is PaymentColumnKey => paymentColumnKeys.includes(value as PaymentColumnKey));

    const unique = Array.from(new Set(keys));
    return unique.length === paymentColumnKeys.length ? [...paymentColumnKeys] : unique;
  };

  const selectedColumns = parseSelectedColumns(sp.columns, sp.column);
  const selectedColumnsSet = new Set<PaymentColumnKey>(selectedColumns);
  const hasCustomColumns = selectedColumns.length > 0 && selectedColumns.length < paymentColumnKeys.length;

  const where: Prisma.PaymentWhereInput = {};
  const andConditions: Prisma.PaymentWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        {
          user: {
            is: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ],
            },
          },
        },
        { razorpayOrderId: { contains: search, mode: "insensitive" as const } },
        {
          razorpayPaymentId: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (amountMin || amountMax) {
    const amountFilter: Prisma.IntFilter = {};

    if (amountMin) {
      amountFilter.gte = Math.round(parseFloat(amountMin) * 100);
    }

    if (amountMax) {
      amountFilter.lte = Math.round(parseFloat(amountMax) * 100);
    }

    andConditions.push({ amount: amountFilter });
  }

  if (dateFrom || dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};

    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }

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
    const [payments, total, revenueAgg] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.count({ where }),
      prisma.payment.aggregate({
      where: { ...where, status: "PAID" },
      _sum: { amount: true },
    }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const totalRevenue = Math.floor((revenueAgg._sum.amount ?? 0) / 100);

  const paymentColumns: Array<{
    key: PaymentColumnKey;
    label: string;
    render: (payment: PaymentRow) => ReactNode;
  }> = [
    {
      key: "user",
      label: "User",
      render: (payment) => (
        <div>
          <div className="font-semibold text-gray-900">{payment.user.name ?? payment.user.email}</div>
          <div className="text-sm text-gray-400">{payment.user.email}</div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      render: (payment) => <span className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount / 100)}</span>,
    },
    {
      key: "breakdown",
      label: "Breakdown",
      render: (payment) => (
        <div className="text-sm text-gray-600">
          <div>Base: {formatCurrency(payment.baseAmount)}</div>
          <div>Profile: {formatCurrency(payment.profileAmount)}</div>
          <div>Chat: {formatCurrency(payment.perProfileChatAmount)}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (payment) => <StatusBadge status={payment.status} />,
    },
    {
      key: "orderId",
      label: "Order ID",
      render: (payment) => <span className="text-sm text-gray-500">{payment.razorpayOrderId}</span>,
    },
    {
      key: "date",
      label: "Date",
      render: (payment) => <span className="text-sm text-gray-500">{formatDate(payment.createdAt)}</span>,
    },
  ];

  const visibleColumns = !hasCustomColumns
    ? paymentColumns
    : paymentColumns.filter((column) => selectedColumnsSet.has(column.key));

  const buildPageHref = (targetPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(targetPage));
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (amountMin) params.set("amountMin", amountMin);
    if (amountMax) params.set("amountMax", amountMax);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("columns", selectedColumns.join(","));
    params.set("limit", String(limit));
    return `?${params.toString()}`;
  };

  const listReturnHref = `/admin/payments${buildPageHref(page)}`;

    return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          {total} total transactions{" • "}{formatCurrency(totalRevenue)} total revenue
        </p>
      </div>

      <div className="border-t border-gray-200" />

      <AdminListCard
        className="min-h-0"
        toolbar={
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <AdminSearchInput placeholder="Search by user, email or order ID..." />

            <div className="flex items-center gap-3 xl:ml-auto">
              <AdminPaymentFilters />
              <AdminPaymentColumnSelector selectedColumns={selectedColumns} />
            </div>
          </div>
        }
        summaryLeft={<span className="font-medium text-gray-700">{total} total transactions</span>}
        summaryRight={
          totalPages > 0 ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <AdminPageSizeSelector value={limit} />

              <div className="flex items-center gap-2">
                <a
                  href={buildPageHref(Math.max(1, page - 1))}
                  aria-label="Previous page"
                  className={`flex h-12 w-12 items-center justify-center border border-gray-200 bg-white text-gray-400 transition-colors ${
                    page === 1 ? "pointer-events-none opacity-40" : "hover:border-rose-300 hover:text-rose-500"
                  }`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </a>

                <div className="flex h-12 w-16 items-center justify-center border border-gray-200 bg-white text-sm font-medium text-gray-700">
                  {page}
                </div>

                <span className="text-sm text-gray-500">of {totalPages || 1}</span>

                <a
                  href={buildPageHref(Math.min(totalPages || 1, page + 1))}
                  aria-label="Next page"
                  className={`flex h-12 w-12 items-center justify-center border border-gray-200 bg-white text-gray-400 transition-colors ${
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
        {!hasCustomColumns ? (
          <AdminPaymentsTable
            payments={payments.map((payment) => {
              const row = payment as unknown as PaymentRow;
              return {
                id: row.id,
                href: `/admin/payments/${row.id}?returnTo=${encodeURIComponent(listReturnHref)}`,
                amount: row.amount,
                baseAmount: row.baseAmount,
                profileAmount: row.profileAmount,
                perProfileChatAmount: row.perProfileChatAmount,
                status: row.status,
                razorpayOrderId: row.razorpayOrderId,
                createdAt: row.createdAt,
                user: row.user,
              };
            })}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {visibleColumns.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wide text-gray-900"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {payments.map((payment) => {
                  const row = payment as unknown as PaymentRow;

                  return (
                    <tr key={row.id} className="transition-colors hover:bg-gray-50">
                      {visibleColumns.map((column) => (
                        <td key={`${row.id}-${column.key}`} className="px-6 py-5 align-top">
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {payments.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No payments yet.</div>
            ) : null}
          </>
        )}
      </AdminListCard>
    </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load payments right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Payments unavailable"
          description="We couldn't reach the database to load the payment list."
        />
      </div>
    );
  }
}
