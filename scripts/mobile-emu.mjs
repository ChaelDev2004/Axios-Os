import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function findAdb() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME &&
      path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe"),
    process.env.ANDROID_SDK_ROOT &&
      path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", "adb.exe"),
    path.join(
      process.env.LOCALAPPDATA || "",
      "Android",
      "Sdk",
      "platform-tools",
      "adb.exe"
    ),
    path.join(
      process.env.USERPROFILE || "",
      "AppData",
      "Local",
      "Android",
      "Sdk",
      "platform-tools",
      "adb.exe"
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return "adb";
}

const adb = findAdb();
const serverUrl = process.env.CAPACITOR_SERVER_URL || "http://127.0.0.1:3000";

console.log(`Using adb: ${adb}`);
console.log(`Server URL: ${serverUrl}/auth/login`);

const devices = spawnSync(adb, ["devices"], { encoding: "utf8" });
console.log(devices.stdout || "");

const reverse = spawnSync(adb, ["reverse", "tcp:3000", "tcp:3000"], {
  encoding: "utf8",
  shell: false,
});

if (reverse.status !== 0) {
  console.warn("adb reverse failed — start an emulator first, then re-run.");
  console.warn(String(reverse.stderr || reverse.stdout || reverse.error || ""));
  console.warn("Falling back to http://10.0.2.2:3000");
  process.env.CAPACITOR_SERVER_URL = "http://10.0.2.2:3000";
} else {
  console.log("adb reverse tcp:3000 -> tcp:3000 OK");
  process.env.CAPACITOR_SERVER_URL = serverUrl;
}
const sync = spawnSync("npx", ["cap", "sync", "android"], {
  encoding: "utf8",
  shell: true,
  env: process.env,
  stdio: "inherit",
});

if (sync.status !== 0) {
  process.exit(sync.status ?? 1);
}

console.log("\nNext: Run the app from Android Studio (Stop → Run).");
console.log("Keep `npm run dev:lan` running on the PC.");
