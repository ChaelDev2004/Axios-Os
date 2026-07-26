/** Pure helpers safe for Edge middleware */

export function parseAdminIpAllowlist(
  raw = process.env.ADMIN_IP_ALLOWLIST?.trim()
): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function isIpAllowedForAdmin(ip: string, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true;
  if (!ip || ip === "unknown") return false;
  return allowlist.includes(ip);
}
