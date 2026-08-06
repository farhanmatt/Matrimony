"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils/helpers";

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className="ui-card-lift-soft rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 shadow-sm scroll-mt-28 transition-colors duration-200">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 ui-icon-lift">
          {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[1.35rem] font-bold text-slate-900 dark:text-white">
            Appearance
          </h2>
          <p className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
            Customize the look and feel of your dashboard.
          </p>
          
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-semibold transition-all",
                theme === "light"
                  ? "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
              )}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-semibold transition-all",
                theme === "dark"
                  ? "border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
              )}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
