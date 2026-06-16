"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import AppLoadingProvider from "@/components/common/AppLoadingProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppLoadingProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: "var(--font-inter)" },
          }}
        />
      </AppLoadingProvider>
    </SessionProvider>
  );
}

