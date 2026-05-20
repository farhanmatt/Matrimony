"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, DatabaseZap, RefreshCw } from "lucide-react";
import { isDatabaseConnectionError } from "@/lib/utils/errors";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDatabaseError = isDatabaseConnectionError(error);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
            isDatabaseError
              ? "bg-amber-100 text-amber-700"
              : "bg-rose-100 text-rose-600"
          }`}
        >
          {isDatabaseError ? (
            <DatabaseZap className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-xl font-display font-bold text-gray-900 mb-2">
            {isDatabaseError
              ? "Unable to reach the database"
              : "Something went wrong in the dashboard"}
          </h1>

          <p className="text-sm text-gray-600 leading-6">
            {isDatabaseError
              ? "Your dashboard could not load because the app could not connect to the database. This is often temporary and usually resolves once the database or network connection is back."
              : "An unexpected error interrupted this dashboard page. You can try again now, or return to the home page."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-rose-300 hover:text-rose-600 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
