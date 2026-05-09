import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <Loader2 className={`animate-spin text-rose-500 ${sizes[size]} ${className}`} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}
