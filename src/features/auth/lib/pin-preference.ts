const PREFER_PIN_KEY = "axios-auth-prefer-pin";
const LAST_EMAIL_KEY = "axios-auth-last-email";

export function hasPinLoginPreference(): boolean {
  try {
    return localStorage.getItem(PREFER_PIN_KEY) === "1";
  } catch {
    return false;
  }
}

export function getRememberedLoginEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberPinLoginPreference(email?: string): void {
  try {
    localStorage.setItem(PREFER_PIN_KEY, "1");
    const trimmed = email?.trim().toLowerCase();
    if (trimmed) {
      localStorage.setItem(LAST_EMAIL_KEY, trimmed);
    }
  } catch {
    /* ignore */
  }
}

export function clearPinLoginPreference(): void {
  try {
    localStorage.removeItem(PREFER_PIN_KEY);
  } catch {
    /* ignore */
  }
}

export function rememberLoginEmail(email: string): void {
  try {
    const trimmed = email.trim().toLowerCase();
    if (trimmed) {
      localStorage.setItem(LAST_EMAIL_KEY, trimmed);
    }
  } catch {
    /* ignore */
  }
}
