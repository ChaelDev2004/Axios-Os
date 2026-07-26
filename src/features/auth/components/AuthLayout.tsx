"use client";

import { motion } from "framer-motion";
import { Moon, Sun, Shield } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="auth-gradient min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-2">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative hidden flex-col justify-between p-10 lg:flex"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight">SecureAuth</span>
          </div>

          <div className="space-y-4">
            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-foreground">
              Modern authentication built for speed and security.
            </h1>
            <p className="max-w-sm text-muted-foreground">
              Email login, fast PIN access, and enterprise-grade protection for
              your account.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Chael Dev. All rights reserved.
          </p>
        </motion.aside>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="mb-6 flex items-center justify-between lg:justify-end">
              <Link
                href="/"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              >
                ← Back to portfolio
              </Link>
              {mounted && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle theme"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            <div className="auth-glass rounded-2xl p-6 sm:p-8">
              <div className="mb-6 space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              </div>
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
