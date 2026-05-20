export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="h-52 shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 shimmer w-2/3 rounded" />
        <div className="h-3 shimmer w-1/2 rounded" />
        <div className="h-3 shimmer w-3/4 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 shimmer w-16 rounded-full" />
          <div className="h-3 shimmer w-20 rounded-full" />
        </div>
        <div className="h-9 shimmer rounded-xl mt-2" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      <div className="w-10 h-10 shimmer rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 shimmer w-1/3 rounded" />
        <div className="h-3 shimmer w-1/2 rounded" />
      </div>
      <div className="h-6 shimmer w-16 rounded-full" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

