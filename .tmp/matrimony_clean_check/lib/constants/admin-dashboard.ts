export const DASHBOARD_RANGE_OPTIONS = [
  { key: "7d", label: "Last 7 Days", days: 7 },
  { key: "30d", label: "Last 30 Days", days: 30 },
  { key: "90d", label: "Last 90 Days", days: 90 },
] as const;

export type DashboardRangeKey = (typeof DASHBOARD_RANGE_OPTIONS)[number]["key"];

export type DashboardRangeConfig = (typeof DASHBOARD_RANGE_OPTIONS)[number];

export function getDashboardRangeConfig(
  range: string | null | undefined,
): DashboardRangeConfig {
  return DASHBOARD_RANGE_OPTIONS.find((option) => option.key === range) ?? DASHBOARD_RANGE_OPTIONS[0];
}
