/**
 * Client-side Vault encryption (AES-GCM + PBKDF2).
 * CryptoKey lives only in memory while the vault is unlocked.
 * Never log plaintext secrets.
 */

const PBKDF2_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

let sessionKey: CryptoKey | null = null;

function getSubtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is not available in this environment.");
  }
  return crypto.subtle;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]!);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function createKdfSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return toBase64(salt);
}

export async function deriveVaultKey(pin: string, saltBase64: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltBase64) as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function setVaultSessionKey(key: CryptoKey | null): void {
  sessionKey = key;
}

export function getVaultSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function clearVaultSessionKey(): void {
  sessionKey = null;
}

export function requireVaultSessionKey(): CryptoKey {
  if (!sessionKey) {
    throw new Error("Vault is locked.");
  }
  return sessionKey;
}

export async function encryptText(plaintext: string, key?: CryptoKey): Promise<string> {
  const cryptoKey = key ?? requireVaultSessionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await getSubtle().encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(plaintext)
  );
  return `${toBase64(iv)}:${toBase64(cipher)}`;
}

export async function decryptText(payload: string, key?: CryptoKey): Promise<string> {
  const cryptoKey = key ?? requireVaultSessionKey();
  const [ivPart, dataPart] = payload.split(":");
  if (!ivPart || !dataPart) {
    throw new Error("Invalid ciphertext.");
  }
  const plain = await getSubtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) as BufferSource },
    cryptoKey,
    fromBase64(dataPart) as BufferSource
  );
  return new TextDecoder().decode(plain);
}

export async function encryptOptional(
  value: string | null | undefined,
  key?: CryptoKey
): Promise<string | null> {
  if (value == null || value === "") return null;
  return encryptText(value, key);
}

export async function decryptOptional(
  value: string | null | undefined,
  key?: CryptoKey
): Promise<string | null> {
  if (!value) return null;
  return decryptText(value, key);
}
