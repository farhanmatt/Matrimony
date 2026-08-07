"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import AppLoadingProvider from "@/components/common/AppLoadingProvider";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
      </ThemeProvider>
    </SessionProvider>
  );
}

