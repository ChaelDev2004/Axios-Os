"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/features/auth/hooks/useAuth";
import { OfflineProvider } from "@/features/offline/components/offline-provider";
import { cn } from "@/lib/utils";

interface AuthAppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthAppShell({ children, className }: AuthAppShellProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <OfflineProvider>
            <div className={cn("auth-app font-sans antialiased", className)}>
              {children}
              <Toaster />
            </div>
          </OfflineProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
