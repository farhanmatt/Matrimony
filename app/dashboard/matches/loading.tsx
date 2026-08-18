import { SkeletonGrid } from "@/components/common/SkeletonCard";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-md"></div>
      <SkeletonGrid count={8} />
    </div>
  );
}
