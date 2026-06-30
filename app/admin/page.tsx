import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { format, addDays, startOfDay, subDays } from "date-fns";
import {
  ArrowRight,
  CreditCard,
  HeartHandshake,
  Activity,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { calculateAge, formatCurrency, formatDate } from "@/lib/utils/helpers";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminDashboardRangeSelector from "@/components/admin/AdminDashboardRangeSelector";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import AdminSidebar from "@/components/layout/AdminSidebar";
import {
  getDashboardRangeConfig,
  type DashboardRangeKey,
} from "@/lib/constants/admin-dashboard";
import AdminPageTransition from "@/components/admin/AdminPageTransition";


export const metadata: Metadata = { title: "Admin Dashboard" };

type ChartPoint = {
  label: string;
  value: number;
};

type TrendState = {
  label: string;
  tone: "positive" | "negative" | "neutral";
};

type ActivityItem = {
  kind: "user" | "profile" | "match" | "payment";
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  title: string;
  detail: string;
  href: string;
  createdAt: Date;
};

type DashboardData = {
  dbUnavailable: boolean;
  stats: {
    totalUsers: number;
    totalProfiles: number;
    activeProfiles: number;
    totalMatches: number;
    totalPayments: number;
    totalRevenue: number;
  } | null;
  trends: {
    users: TrendState;
    profiles: TrendState;
    matches: TrendState;
    payments: TrendState;
    revenue: TrendState;
  } | null;
  registrationsSeries: ChartPoint[];
  revenueSeries: ChartPoint[];
  recentActivity: ActivityItem[];
};

function trendLabel(current: number, previous: number): TrendState {
  if (previous <= 0) {
    return { label: "No comparison yet", tone: "neutral" };
  }

  const percent = Math.round(((current - previous) / previous) * 100);

  if (percent > 0) {
    return { label: `+${percent}% from last month`, tone: "positive" };
  }

  if (percent < 0) {
    return { label: `${percent}% from last month`, tone: "negative" };
  }

  return { label: "No change from last month", tone: "neutral" };
}

function trendLabelForRange(
  current: number,
  previous: number,
  comparisonLabel: string
): TrendState {
  const trend = trendLabel(current, previous);

  if (trend.label === "No comparison yet") {
    return trend;
  }

  return {
    ...trend,
    label: trend.label.replace("from last month", `from ${comparisonLabel}`),
  };
}

function buildDailySeries(
  dates: Date[],
  rows: Array<{ createdAt: Date; value: number }>
): ChartPoint[] {
  const lookup = new Map<string, number>();

  rows.forEach((row) => {
    const key = format(row.createdAt, "yyyy-MM-dd");
    lookup.set(key, (lookup.get(key) ?? 0) + row.value);
  });

  return dates.map((date) => {
    const key = format(date, "yyyy-MM-dd");
    return {
      label: format(date, "dd MMM"),
      value: lookup.get(key) ?? 0,
    };
  });
}

function formatCompactRupees(value: number): string {
  if (value <= 0) return "₹0";
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`;
  return formatCurrency(value);
}

function MetricCard({
  icon: Icon,
  iconClassName,
  iconBgClassName,
  value,
  label,
  trend,
}: {
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  value: string;
  label: string;
  trend: TrendState;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconBgClassName}`}>
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>
      <div className="mt-5 text-3xl font-display font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{label}</div>
      <div
        className={`mt-2 text-xs font-medium ${
          trend.tone === "positive"
            ? "text-emerald-600"
            : trend.tone === "negative"
              ? "text-rose-500"
              : "text-gray-400"
        }`}
      >
        {trend.label}
      </div>
    </div>
  );
}

function MiniAreaChart({
  series,
  stroke,
  fill,
  yTickFormatter,
}: {
  series: ChartPoint[];
  stroke: string;
  fill: string;
  yTickFormatter: (value: number) => string;
}) {
  const width = 1000;
  const height = 280;
  const paddingLeft = 42;
  const paddingRight = 18;
  const paddingTop = 20;
  const paddingBottom = 46;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...series.map((point) => point.value), 1);
  const tickCount = 4;

  const chartPoints = series.map((point, index) => {
    const x =
      series.length > 1
        ? paddingLeft + (chartWidth * index) / (series.length - 1)
        : paddingLeft + chartWidth / 2;
    const y = paddingTop + chartHeight * (1 - point.value / maxValue);
    return { x, y, ...point };
  });
  const labelStride = Math.max(1, Math.ceil(series.length / 7));

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${paddingTop + chartHeight} L ${chartPoints[0].x} ${paddingTop + chartHeight} Z`;
  const tickValues = Array.from({ length: tickCount + 1 }, (_, index) => (maxValue / tickCount) * index);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-72 w-full"
      role="img"
      aria-label="Area chart"
    >
      <defs>
        <linearGradient id={`fill-${stroke.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.32" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {tickValues.map((tickValue, index) => {
        const y = paddingTop + chartHeight * (1 - tickValue / maxValue);
        return (
          <g key={`grid-${index}`}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="6 6"
            />
            <text
              x={0}
              y={y + 4}
              className="fill-gray-400 text-[12px] font-medium"
            >
              {yTickFormatter(tickValue)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={`url(#fill-${stroke.replace(/[^a-z0-9]/gi, "")})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {chartPoints.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="4.5" fill={stroke} />
          <circle cx={point.x} cy={point.y} r="8.5" fill={stroke} opacity="0.09" />
          {index % labelStride === 0 || index === chartPoints.length - 1 ? (
            <text
              x={point.x}
              y={height - 15}
              textAnchor="middle"
              className="fill-gray-500 text-[12px]"
            >
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function ChartCard({
  title,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  series,
  stroke,
  fill,
  yTickFormatter,
  range,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  series: ChartPoint[];
  stroke: string;
  fill: string;
  yTickFormatter: (value: number) => string;
  range: DashboardRangeKey;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${iconBgClassName}`}>
            <Icon className={`h-5 w-5 ${iconClassName}`} />
          </div>
          <h3 className="font-display text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        <AdminDashboardRangeSelector currentRange={range} />
      </div>

      <div className="mt-4">
        <MiniAreaChart series={series} stroke={stroke} fill={fill} yTickFormatter={yTickFormatter} />
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-rose-500" />
    </Link>
  );
}

function RecentActivityTable({
  items,
}: {
  items: ActivityItem[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <h3 className="font-display text-lg font-semibold text-gray-900">Recent Activity</h3>
        <Link
          href="/admin/notifications"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-rose-300 hover:text-rose-600"
        >
          View All
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                Activity
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                Details
              </th>
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                Date & Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <tr key={`${item.title}-${item.createdAt.toISOString()}`} className="group hover:bg-gray-50">
                  <td className="p-0">
                    <Link
                      href={item.href}
                      className="flex h-full w-full items-center gap-3 px-5 py-4"
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBgClassName}`}>
                        <Icon className={`h-4 w-4 ${item.iconClassName}`} />
                      </div>
                      <span className="font-medium text-gray-900 transition-colors group-hover:text-rose-600">
                        {item.title}
                      </span>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={item.href}
                      className="flex h-full w-full items-center px-5 py-4 text-gray-600 transition-colors group-hover:text-gray-900"
                    >
                      {item.detail}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link
                      href={item.href}
                      className="flex h-full w-full items-center justify-between gap-3 px-5 py-4 text-gray-500 transition-colors group-hover:text-rose-600"
                    >
                      <span>{format(item.createdAt, "dd MMM yyyy, hh:mm a")}</span>
                      <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 ? (
          <div className="py-10 text-center text-gray-400">No recent activity yet.</div>
        ) : null}
      </div>
    </div>
  );
}

async function getAdminDashboardData(rangeKey: DashboardRangeKey): Promise<DashboardData> {
  const range = getDashboardRangeConfig(rangeKey);
  const now = new Date();
  const chartStart = startOfDay(subDays(now, range.days - 1));
  const chartDays = Array.from({ length: range.days }, (_, index) => addDays(chartStart, index));
  const currentWindowStart = chartStart;
  const previousWindowStart = subDays(chartStart, range.days);
  const previousWindowEnd = chartStart;
  const comparisonLabel = `previous ${range.days} days`;

  try {
    const [
      totalUsers,
      totalProfiles,
      activeProfiles,
      totalMatches,
      paymentsAgg,
      usersCurrentWindow,
      usersPreviousWindow,
      activeProfilesCurrentWindow,
      activeProfilesPreviousWindow,
      matchesCurrentWindow,
      matchesPreviousWindow,
      paymentsCurrentWindow,
      paymentsPreviousWindow,
      revenueCurrentWindow,
      revenuePreviousWindow,
      recentUsers,
      recentProfiles,
      recentMatches,
      recentPayments,
      registrationRows,
      revenueRows,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.profile.count(),
      prisma.profile.count({ where: { status: "ACTIVE" } }),
      prisma.match.count(),
      prisma.payment.aggregate({
        where: { status: "PAID" },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.user.count({
        where: {
          role: "USER",
          createdAt: { gte: currentWindowStart },
        },
      }),
      prisma.user.count({
        where: {
          role: "USER",
          createdAt: { gte: previousWindowStart, lt: previousWindowEnd },
        },
      }),
      prisma.profile.count({
        where: {
          status: "ACTIVE",
          createdAt: { gte: currentWindowStart },
        },
      }),
      prisma.profile.count({
        where: {
          status: "ACTIVE",
          createdAt: { gte: previousWindowStart, lt: previousWindowEnd },
        },
      }),
      prisma.match.count({
        where: {
          createdAt: { gte: currentWindowStart },
        },
      }),
      prisma.match.count({
        where: {
          createdAt: { gte: previousWindowStart, lt: previousWindowEnd },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PAID",
          createdAt: { gte: currentWindowStart },
        },
      }),
      prisma.payment.count({
        where: {
          status: "PAID",
          createdAt: { gte: previousWindowStart, lt: previousWindowEnd },
        },
      }),
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          createdAt: { gte: currentWindowStart },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          createdAt: { gte: previousWindowStart, lt: previousWindowEnd },
        },
        _sum: { amount: true },
      }),
      prisma.user.findMany({
        where: { role: "USER" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          name: true,
          email: true,
          createdAt: true,
          profile: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.profile.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          fullName: true,
          dateOfBirth: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.match.findMany({
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          createdAt: true,
          profileA: { select: { id: true, fullName: true } },
          profileB: { select: { id: true, fullName: true } },
        },
      }),
      prisma.payment.findMany({
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          amount: true,
          razorpayOrderId: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "USER", createdAt: { gte: chartStart } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { status: "PAID", createdAt: { gte: chartStart } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const registrationsSeries = buildDailySeries(
      chartDays,
      registrationRows.map((row) => ({ createdAt: row.createdAt, value: 1 }))
    );

    const revenueSeries = buildDailySeries(
      chartDays,
      revenueRows.map((row) => ({ createdAt: row.createdAt, value: row.amount / 100 }))
    );

    const recentActivity: ActivityItem[] = [
      ...recentUsers.map((user) => ({
        kind: "user" as const,
        icon: Users,
        iconClassName: "text-emerald-600",
        iconBgClassName: "bg-emerald-50",
        title: "New user registered",
        detail: user.name ?? user.email,
        href: user.profile?.id
          ? `/admin/profiles/${user.profile.id}`
          : `/admin/users?search=${encodeURIComponent(user.name ?? user.email)}`,
        createdAt: user.createdAt,
      })),
      ...recentProfiles.map((profile) => ({
        kind: "profile" as const,
        icon: UserCheck,
        iconClassName: "text-rose-600",
        iconBgClassName: "bg-rose-50",
        title: "New profile created",
        detail: `${profile.fullName} (${calculateAge(profile.dateOfBirth)} yrs)`,
        href: `/admin/profiles/${profile.id}`,
        createdAt: profile.createdAt,
      })),
      ...recentMatches.map((match) => ({
        kind: "match" as const,
        icon: HeartHandshake,
        iconClassName: "text-violet-600",
        iconBgClassName: "bg-violet-50",
        title: "New match found",
        detail: `${match.profileA.fullName} & ${match.profileB.fullName}`,
        href: `/admin/matches/${match.id}`,
        createdAt: match.createdAt,
      })),
      ...recentPayments.map((payment) => ({
        kind: "payment" as const,
        icon: CreditCard,
        iconClassName: "text-amber-600",
        iconBgClassName: "bg-amber-50",
        title: "Payment received",
        detail: `Payment of ${formatCurrency(payment.amount / 100)}`,
        href: `/admin/payments?search=${encodeURIComponent(payment.razorpayOrderId)}`,
        createdAt: payment.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return {
      dbUnavailable: false,
      stats: {
        totalUsers,
        totalProfiles,
        activeProfiles,
        totalMatches,
        totalPayments: paymentsAgg._count,
        totalRevenue: Math.floor((paymentsAgg._sum.amount ?? 0) / 100),
      },
      trends: {
        users: trendLabelForRange(usersCurrentWindow, usersPreviousWindow, comparisonLabel),
        profiles: trendLabelForRange(activeProfilesCurrentWindow, activeProfilesPreviousWindow, comparisonLabel),
        matches: trendLabelForRange(matchesCurrentWindow, matchesPreviousWindow, comparisonLabel),
        payments: trendLabelForRange(paymentsCurrentWindow, paymentsPreviousWindow, comparisonLabel),
        revenue: trendLabelForRange(
          Math.floor((revenueCurrentWindow._sum.amount ?? 0) / 100),
          Math.floor((revenuePreviousWindow._sum.amount ?? 0) / 100),
          comparisonLabel
        ),
      },
      registrationsSeries,
      revenueSeries,
      recentActivity,
    };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return {
        dbUnavailable: true,
        stats: null,
        trends: null,
        registrationsSeries: [],
        revenueSeries: [],
        recentActivity: [],
      };
    }

    throw error;
  }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    range?: string;
  }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRange = getDashboardRangeConfig(resolvedSearchParams.range);
  const dashboard = await getAdminDashboardData(selectedRange.key);

  if (dashboard.dbUnavailable || !dashboard.stats || !dashboard.trends) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Overview of platform activity and metrics
            </p>
          </div>
          <AdminNotificationBell notifications={[]} />
        </div>

        <AdminDatabaseUnavailableState
          title="Admin dashboard unavailable"
          description="We couldn't reach the database to load the dashboard metrics, charts, and recent activity."
        />
      </div>
    );
  }

  const { stats, trends, registrationsSeries, revenueSeries, recentActivity } = dashboard;
  const notificationItems = recentActivity.map((item) => ({
    id: `${item.kind}-${item.createdAt.toISOString()}`,
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    createdAt: item.createdAt.toISOString(),
    createdAtLabel: format(item.createdAt, "dd MMM yyyy, hh:mm a"),
  }));

  const statCards = [
    {
      icon: Users,
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      iconClassName: "text-blue-600",
      iconBgClassName: "bg-blue-50",
      trend: trends.users,
    },
    {
      icon: UserCheck,
      label: "Active Profiles",
      value: stats.activeProfiles.toLocaleString(),
      iconClassName: "text-emerald-600",
      iconBgClassName: "bg-emerald-50",
      trend: trends.profiles,
    },
    {
      icon: HeartHandshake,
      label: "Total Matches",
      value: stats.totalMatches.toLocaleString(),
      iconClassName: "text-rose-600",
      iconBgClassName: "bg-rose-50",
      trend: trends.matches,
    },
    {
      icon: CreditCard,
      label: "Paid Transactions",
      value: stats.totalPayments.toLocaleString(),
      iconClassName: "text-violet-600",
      iconBgClassName: "bg-violet-50",
      trend: trends.payments,
    },
    {
      icon: TrendingUp,
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      iconClassName: "text-amber-600",
      iconBgClassName: "bg-amber-50",
      trend: trends.revenue,
    },
  ];

  const quickActions = [
    {
      href: "/admin/users",
      label: "Manage Users",
      description: "View and manage users",
      icon: Users,
    },
    {
      href: "/admin/profiles",
      label: "Manage Profiles",
      description: "View and manage profiles",
      icon: UserCheck,
    },
    {
      href: "/admin/payments",
      label: "View Payments",
      description: "View all transactions",
      icon: CreditCard,
    },
    {
      href: "/admin/settings",
      label: "Update Pricing",
      description: "Configure pricing settings",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <AdminSidebar />
      <main className="min-h-screen pt-16 lg:ml-56 lg:pt-0">
        <div className="max-w-none px-3 py-4 sm:px-4 sm:py-5 lg:px-5 lg:py-6">
          <AdminPageTransition className="space-y-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-display font-bold text-gray-900">Admin Dashboard</h1>
                <p className="mt-2 text-sm text-gray-500">
                  Overview of platform activity and metrics
                </p>
              </div>

              <AdminNotificationBell notifications={notificationItems} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {statCards.map((card) => (
                <MetricCard
                  key={card.label}
                  icon={card.icon}
                  iconClassName={card.iconClassName}
                  iconBgClassName={card.iconBgClassName}
                  value={card.value}
                  label={card.label}
                  trend={card.trend}
                />
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard
                title="User Registrations"
                icon={Users}
                iconClassName="text-blue-600"
                iconBgClassName="bg-blue-50"
                series={registrationsSeries}
                stroke="#2563EB"
                fill="#60A5FA"
                yTickFormatter={(value) => `${Math.round(value)}`}
                range={selectedRange.key}
              />

              <ChartCard
                title="Revenue Overview"
                icon={TrendingUp}
                iconClassName="text-emerald-600"
                iconBgClassName="bg-emerald-50"
                series={revenueSeries}
                stroke="#16A34A"
                fill="#4ADE80"
                yTickFormatter={(value) => formatCompactRupees(value)}
                range={selectedRange.key}
              />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-semibold text-gray-900">Quick Actions</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <QuickActionCard key={action.href} {...action} />
                ))}
              </div>
            </div>

            <RecentActivityTable items={recentActivity} />
          </AdminPageTransition>
        </div>
      </main>
    </div>
  );
}
