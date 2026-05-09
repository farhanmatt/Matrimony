"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

type AppLoadingContextValue = {
  isLoading: boolean;
  pendingCount: number;
  startLoading: () => void;
  stopLoading: () => void;
  trackPromise: <T>(promise: Promise<T>) => Promise<T>;
};

const AppLoadingContext = createContext<AppLoadingContextValue | null>(null);

export function useAppLoading() {
  const context = useContext(AppLoadingContext);

  if (!context) {
    throw new Error("useAppLoading must be used within AppLoadingProvider");
  }

  return context;
}

function NavigationLoadingWatcher({
  onNavigationComplete,
}: {
  onNavigationComplete: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onNavigationComplete();
  }, [pathname, searchParams, onNavigationComplete]);

  return null;
}

export default function AppLoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const pendingCountRef = useRef(0);
  const navigationPendingRef = useRef(false);
  const navigationLoaderActiveRef = useRef(false);
  const navigationStartTimerRef = useRef<number | null>(null);

  const syncPendingCount = useCallback((nextCount: number) => {
    pendingCountRef.current = nextCount;
    setPendingCount(nextCount);
  }, []);

  const startLoading = useCallback(() => {
    syncPendingCount(pendingCountRef.current + 1);
  }, [syncPendingCount]);

  const stopLoading = useCallback(() => {
    syncPendingCount(Math.max(0, pendingCountRef.current - 1));
  }, [syncPendingCount]);

  const startNavigationLoading = useCallback(() => {
    if (navigationPendingRef.current) {
      return;
    }

    navigationPendingRef.current = true;
    navigationStartTimerRef.current = window.setTimeout(() => {
      navigationStartTimerRef.current = null;

      if (!navigationPendingRef.current || navigationLoaderActiveRef.current) {
        return;
      }

      navigationLoaderActiveRef.current = true;
      startLoading();
    }, 0);
  }, [startLoading]);

  const stopNavigationLoading = useCallback(() => {
    if (!navigationPendingRef.current) {
      return;
    }

    navigationPendingRef.current = false;

    if (navigationStartTimerRef.current !== null) {
      window.clearTimeout(navigationStartTimerRef.current);
      navigationStartTimerRef.current = null;
    }

    if (!navigationLoaderActiveRef.current) {
      return;
    }

    navigationLoaderActiveRef.current = false;
    stopLoading();
  }, [stopLoading]);

  const trackPromise = useCallback(
    async <T,>(promise: Promise<T>) => {
      startLoading();
      try {
        return await promise;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  useEffect(() => {
    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    if (pendingCount > 0) {
      window.clearTimeout(hideTimer);
      showTimer = window.setTimeout(() => setVisible(true), 120);
    } else {
      window.clearTimeout(showTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 180);
    }

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pendingCount]);

  useEffect(() => {
    const originalFetch = window.fetch;

    const trackedFetch: typeof window.fetch = async (...args) => {
      startLoading();

      try {
        return await originalFetch(...args);
      } finally {
        stopLoading();
      }
    };

    window.fetch = trackedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [startLoading, stopLoading]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      try {
        const destination = new URL(anchor.href, window.location.href);
        const current = new URL(window.location.href);

        if (destination.origin !== current.origin) {
          return;
        }

        if (
          destination.pathname === current.pathname &&
          destination.search === current.search &&
          destination.hash === current.hash
        ) {
          return;
        }

        startNavigationLoading();
      } catch {
        // Ignore invalid URLs.
      }
    };

    const handlePopState = () => {
      startNavigationLoading();
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = (...args) => {
      startNavigationLoading();
      return originalPushState(...args);
    };

    window.history.replaceState = (...args) => {
      startNavigationLoading();
      return originalReplaceState(...args);
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;

      if (navigationStartTimerRef.current !== null) {
        window.clearTimeout(navigationStartTimerRef.current);
        navigationStartTimerRef.current = null;
      }
    };
  }, [startNavigationLoading]);

  const value = useMemo<AppLoadingContextValue>(
    () => ({
      isLoading: pendingCount > 0,
      pendingCount,
      startLoading,
      stopLoading,
      trackPromise,
    }),
    [pendingCount, startLoading, stopLoading, trackPromise]
  );

  return (
    <AppLoadingContext.Provider value={value}>
      <Suspense fallback={null}>
        <NavigationLoadingWatcher
          onNavigationComplete={stopNavigationLoading}
        />
      </Suspense>

      {children}

      <div
        aria-hidden={!visible}
        className={`pointer-events-none fixed inset-x-0 top-0 z-[120] transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative h-1 overflow-hidden bg-rose-100/70">
          <div className="app-loading-bar absolute inset-y-0 left-0 rounded-r-full bg-gradient-to-r from-rose-500 via-pink-500 to-rose-400" />
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed inset-0 z-[121] flex items-center justify-center px-6 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white/96 px-5 py-3 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <LoadingSpinner size="sm" />
          <span className="text-sm font-medium text-slate-700">
            Loading...
          </span>
        </div>
      </div>
    </AppLoadingContext.Provider>
  );
}
