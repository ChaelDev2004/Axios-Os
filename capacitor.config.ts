import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell for AXIOS OS login + dashboard.
 *
 * Production (default):
 *   https://axios-os-one.vercel.app
 *
 * Local LAN Next server:
 *   $env:CAPACITOR_SERVER_URL="http://YOUR_LAN_IP:3000"
 *   npm run cap:sync
 *
 * USB + adb reverse:
 *   npm run mobile:emu
 *
 * Emulator without reverse:
 *   $env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
 */
const serverUrl = (
  process.env.CAPACITOR_SERVER_URL ?? "https://axios-os-one.vercel.app"
)
  .trim()
  .replace(/\/$/, "");

const isHttps = serverUrl.startsWith("https://");

const config: CapacitorConfig = {
  appId: "com.axiosos.app",
  appName: "AXIOS OS",
  webDir: "www",
  backgroundColor: "#09090b",
  android: {
    allowMixedContent: !isHttps,
    backgroundColor: "#09090b",
  },
  server: {
    androidScheme: isHttps ? "https" : "http",
    cleartext: !isHttps,
    // Login first — landing WebGL often blacks out Android WebViews.
    url: `${serverUrl}/auth/login`,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#09090b",
      androidScaleType: "CENTER_INSIDE",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#09090b",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
