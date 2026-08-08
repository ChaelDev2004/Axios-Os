export type VaultCredentialType =
  | "login"
  | "password"
  | "api_key"
  | "card"
  | "secure_note"
  | "server"
  | "email"
  | "wifi"
  | "custom";

export type VaultSortOption =
  | "updated_desc"
  | "created_desc"
  | "name_asc"
  | "name_desc"
  | "favorites"
  | "website";

export type VaultTypeFilter =
  | "all"
  | "favorites"
  | VaultCredentialType;

export type VaultAutoLockMinutes = 0 | 1 | 5 | 15 | 30;

/** Decrypted type-specific sensitive metadata (never stored plaintext). */
export type VaultSensitiveMeta = {
  apiKey?: string;
  environment?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  cardholder?: string;
  host?: string;
  port?: string;
  sshKey?: string;
  wifiSsid?: string;
  wifiPassword?: string;
  customFields?: Record<string, string>;
};

export type VaultCredentialInput = {
  name: string;
  type: VaultCredentialType;
  username?: string | null;
  secret?: string | null;
  website?: string | null;
  folderId?: string | null;
  favorite?: boolean;
  tags?: string[];
  notes?: string | null;
  meta?: VaultSensitiveMeta | null;
};

export type DecryptedVaultCredential = {
  id: string;
  userId: string;
  name: string;
  type: VaultCredentialType;
  username: string | null;
  secret: string | null;
  website: string | null;
  domain: string | null;
  iconUrl: string | null;
  folderId: string | null;
  favorite: boolean;
  tags: string[];
  notes: string | null;
  meta: VaultSensitiveMeta;
  createdAt: string;
  updatedAt: string;
};

export type VaultFolder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type VaultSettings = {
  userId: string;
  pinHash: string;
  kdfSalt: string;
  autoLockMinutes: VaultAutoLockMinutes;
  createdAt: string;
  updatedAt: string;
};

export const VAULT_TYPE_LABELS: Record<VaultCredentialType, string> = {
  login: "Login",
  password: "Password",
  api_key: "API Key",
  card: "Card",
  secure_note: "Secure Note",
  server: "Server / VPS",
  email: "Email",
  wifi: "Wi-Fi",
  custom: "Custom",
};

export const VAULT_FILTER_CHIPS: Array<{ id: VaultTypeFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "login", label: "Login" },
  { id: "api_key", label: "API Keys" },
  { id: "card", label: "Cards" },
  { id: "secure_note", label: "Secure Notes" },
  { id: "server", label: "Servers" },
];

export const MAX_VAULT_TAGS = 5;
