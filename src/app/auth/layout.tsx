import { Inter } from "next/font/google";
import "../auth.css";
import { AuthAppShell } from "@/features/auth/components/AuthAppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function AuthRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthAppShell className={inter.variable}>{children}</AuthAppShell>
  );
}
