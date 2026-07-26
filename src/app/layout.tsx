import type { Metadata, Viewport } from "next";
import { Montserrat, Space_Grotesk, IBM_Plex_Mono, Geist } from "next/font/google";
import { CapacitorBootstrap } from "@/components/CapacitorBootstrap";
import { ClientChrome } from "@/components/ClientChrome";
import "./globals.css";
import "./landing-theme.css";
import "./experience-hero.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-montserrat",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-space-grotesk",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "AXIOS OS",
  description:
    "Full Stack Developer portfolio — modern web development with intent.",
  icons: {
    icon: [
      { url: "/assets/appLogo/axiosLogo.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
    ],
    apple: "/assets/appLogo/axiosLogo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AXIOS OS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("is-loading", montserrat.variable, spaceGrotesk.variable, ibmPlexMono.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body>
        <CapacitorBootstrap />
        <ClientChrome />
        {children}
      </body>
    </html>
  );
}
