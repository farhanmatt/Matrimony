import { SkeletonCard, SkeletonRow } from "@/components/common/SkeletonCard";

export default function DashboardLoading() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2.05fr)_290px] animate-pulse">
      <div className="space-y-6">
        {/* Top Banner Skeleton */}
        <div className="h-56 w-full bg-slate-100/80 rounded-[14px]"></div>

        {/* Recommended Profiles Skeleton */}
        <div className="rounded-[30px] border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="h-8 w-64 bg-slate-100/80 rounded mb-4"></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>

        {/* Bottom Section Skeleton */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-6 w-32 bg-slate-100/80 rounded mb-4"></div>
            <div className="space-y-2">
               <SkeletonRow />
               <SkeletonRow />
            </div>
          </div>
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-6 w-32 bg-slate-100/80 rounded mb-4"></div>
            <div className="space-y-2">
               <SkeletonRow />
               <SkeletonRow />
            </div>
          </div>
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="h-6 w-32 bg-slate-100/80 rounded mb-4"></div>
            <div className="h-32 w-full bg-slate-100/80 rounded-xl mt-4"></div>
          </div>
        </div>
      </div>
      
      {/* Right Sidebar Skeleton */}
      <aside className="hidden xl:flex xl:w-[290px] xl:flex-col xl:gap-6">
        <div className="h-[414px] w-full bg-slate-100/80 rounded-[16px]"></div>
      </aside>
    </div>
  );
}
