"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Star, X } from "lucide-react";
import { PasswordField } from "@/components/vault/password-field";
import { PasswordGenerator } from "@/components/vault/password-generator";
import { TagInput } from "@/components/vault/tag-input";
import { WebsiteIcon } from "@/components/vault/website-icon";
import { extractDomain, googleFaviconUrl, normalizeWebsiteUrl } from "@/features/vault/lib/url";
import type {
  DecryptedVaultCredential,
  VaultCredentialInput,
  VaultCredentialType,
  VaultFolder,
  VaultSensitiveMeta,
} from "@/features/vault/types";
import { VAULT_TYPE_LABELS } from "@/features/vault/types";

type CredentialDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: DecryptedVaultCredential | null;
  folders: VaultFolder[];
  saving?: boolean;
  onClose: () => void;
  onSave: (input: VaultCredentialInput) => void;
  onCreateFolder?: (name: string) => Promise<void>;
};

type FormState = {
  name: string;
  type: VaultCredentialType;
  username: string;
  secret: string;
  website: string;
  folderId: string;
  favorite: boolean;
  tags: string[];
  notes: string;
  host: string;
  port: string;
  sshKey: string;
  environment: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardholder: string;
  wifiSsid: string;
};

const EMPTY: FormState = {
  name: "",
  type: "login",
  username: "",
  secret: "",
  website: "",
  folderId: "",
  favorite: false,
  tags: [],
  notes: "",
  host: "",
  port: "22",
  sshKey: "",
  environment: "",
  cardNumber: "",
  cardExpiry: "",
  cardCvv: "",
  cardholder: "",
  wifiSsid: "",
};

function fromCredential(c: DecryptedVaultCredential): FormState {
  return {
    name: c.name,
    type: c.type,
    username: c.username ?? "",
    secret: c.secret ?? "",
    website: c.website ?? "",
    folderId: c.folderId ?? "",
    favorite: c.favorite,
    tags: c.tags,
    notes: c.notes ?? "",
    host: c.meta.host ?? "",
    port: c.meta.port ?? "22",
    sshKey: c.meta.sshKey ?? "",
    environment: c.meta.environment ?? "",
    cardNumber: c.meta.cardNumber ?? "",
    cardExpiry: c.meta.cardExpiry ?? "",
    cardCvv: c.meta.cardCvv ?? "",
    cardholder: c.meta.cardholder ?? "",
    wifiSsid: c.meta.wifiSsid ?? "",
  };
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  background: "rgba(2, 6, 14, 0.66)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 16,
};

const panel: CSSProperties = {
  width: "min(100%, 520px)",
  maxHeight: "min(92vh, 760px)",
  overflowY: "auto",
  borderRadius: 20,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--background) 94%, #0f1220)",
  color: "var(--foreground)",
  padding: 20,
  marginBottom: 8,
};

const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 650,
  letterSpacing: "0.08em",
  color: "var(--muted-foreground)",
  marginBottom: 6,
  display: "block",
};

const field: CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  color: "var(--foreground)",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
};

const textarea: CSSProperties = {
  ...field,
  height: "auto",
  minHeight: 88,
  padding: 12,
  resize: "vertical",
};

export function CredentialDialog({
  open,
  mode,
  initial,
  folders,
  saving,
  onClose,
  onSave,
  onCreateFolder,
}: CredentialDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [showGenerator, setShowGenerator] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? fromCredential(initial) : EMPTY);
    setShowGenerator(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const domain = useMemo(() => extractDomain(form.website), [form.website]);
  const iconUrl = domain ? googleFaviconUrl(domain) : null;

  const secretLabel =
    form.type === "api_key"
      ? "API KEY"
      : form.type === "wifi"
        ? "WI-FI PASSWORD"
        : form.type === "secure_note"
          ? "CONTENT"
          : "PASSWORD";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const meta: VaultSensitiveMeta = {};
    if (form.type === "api_key") {
      meta.environment = form.environment || undefined;
      if (form.secret) meta.apiKey = form.secret;
    }
    if (form.type === "server") {
      meta.host = form.host || undefined;
      meta.port = form.port || undefined;
      meta.sshKey = form.sshKey || undefined;
    }
    if (form.type === "card") {
      meta.cardNumber = form.cardNumber || undefined;
      meta.cardExpiry = form.cardExpiry || undefined;
      meta.cardCvv = form.cardCvv || undefined;
      meta.cardholder = form.cardholder || undefined;
    }
    if (form.type === "wifi") {
      meta.wifiSsid = form.wifiSsid || undefined;
      meta.wifiPassword = form.secret || undefined;
    }

    const website = form.website.trim()
      ? normalizeWebsiteUrl(form.website) ?? form.website.trim()
      : null;

    const input: VaultCredentialInput = {
      name: form.name.trim(),
      type: form.type,
      username: form.username.trim() || null,
      secret:
        form.type === "secure_note"
          ? form.notes || null
          : form.secret || null,
      website,
      folderId: form.folderId || null,
      favorite: form.favorite,
      tags: form.tags,
      notes: form.type === "secure_note" ? form.notes || null : form.notes || null,
      meta,
    };

    // For secure notes, keep content in notes and also secret for list reveal
    if (form.type === "secure_note") {
      input.secret = form.notes || null;
      input.notes = form.notes || null;
    }

    onSave(input);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="vault-modal-root"
      style={overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={mode === "create" ? "New Credential" : "Edit Credential"}
        onSubmit={submit}
        style={panel}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="axion-kicker">Vault</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 650 }}>
              {mode === "create" ? "New Credential" : "Edit Credential"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--muted-foreground)",
              cursor: "pointer",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={fieldLabel}>TYPE</label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as VaultCredentialType }))
              }
              style={field}
            >
              {(Object.keys(VAULT_TYPE_LABELS) as VaultCredentialType[]).map((t) => (
                <option key={t} value={t}>
                  {VAULT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={fieldLabel}>NAME</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="GitHub"
              style={field}
            />
          </div>

          {form.type !== "secure_note" && form.type !== "card" ? (
            <div>
              <label style={fieldLabel}>USERNAME / EMAIL</label>
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="dev@example.com"
                style={field}
                autoComplete="off"
              />
            </div>
          ) : null}

          {form.type === "server" ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
                <div>
                  <label style={fieldLabel}>HOST / IP</label>
                  <input
                    value={form.host}
                    onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                    placeholder="123.123.123.123"
                    style={field}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>PORT</label>
                  <input
                    value={form.port}
                    onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                    placeholder="22"
                    style={field}
                  />
                </div>
              </div>
              <div>
                <label style={fieldLabel}>SSH KEY</label>
                <textarea
                  value={form.sshKey}
                  onChange={(e) => setForm((f) => ({ ...f, sshKey: e.target.value }))}
                  placeholder="Optional private key"
                  style={textarea}
                />
              </div>
            </>
          ) : null}

          {form.type === "api_key" ? (
            <div>
              <label style={fieldLabel}>ENVIRONMENT</label>
              <input
                value={form.environment}
                onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
                placeholder="Production"
                style={field}
              />
            </div>
          ) : null}

          {form.type === "card" ? (
            <>
              <div>
                <label style={fieldLabel}>CARDHOLDER</label>
                <input
                  value={form.cardholder}
                  onChange={(e) => setForm((f) => ({ ...f, cardholder: e.target.value }))}
                  style={field}
                />
              </div>
              <div>
                <label style={fieldLabel}>CARD NUMBER</label>
                <input
                  value={form.cardNumber}
                  onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))}
                  style={field}
                  autoComplete="off"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={fieldLabel}>EXPIRY</label>
                  <input
                    value={form.cardExpiry}
                    onChange={(e) => setForm((f) => ({ ...f, cardExpiry: e.target.value }))}
                    placeholder="MM/YY"
                    style={field}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>CVV</label>
                  <PasswordField
                    value={form.cardCvv}
                    onChange={(v) => setForm((f) => ({ ...f, cardCvv: v }))}
                    showGenerate={false}
                    showCopy
                  />
                </div>
              </div>
            </>
          ) : null}

          {form.type === "wifi" ? (
            <div>
              <label style={fieldLabel}>SSID</label>
              <input
                value={form.wifiSsid}
                onChange={(e) => setForm((f) => ({ ...f, wifiSsid: e.target.value }))}
                style={field}
              />
            </div>
          ) : null}

          {form.type !== "secure_note" && form.type !== "card" ? (
            <div>
              <PasswordField
                id="vault-secret"
                label={secretLabel}
                value={form.secret}
                onChange={(v) => setForm((f) => ({ ...f, secret: v }))}
                showGenerate={form.type === "login" || form.type === "password" || form.type === "wifi"}
                onGenerateClick={() => setShowGenerator((v) => !v)}
              />
              {showGenerator ? (
                <div style={{ marginTop: 10 }}>
                  <PasswordGenerator
                    onClose={() => setShowGenerator(false)}
                    onUse={(password) => {
                      setForm((f) => ({ ...f, secret: password }));
                      setShowGenerator(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {form.type === "secure_note" ? (
            <div>
              <label style={fieldLabel}>SECURE NOTE</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Private notes…"
                style={textarea}
              />
            </div>
          ) : (
            <div>
              <label style={fieldLabel}>NOTES</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
                style={textarea}
              />
            </div>
          )}

          <div>
            <label style={fieldLabel}>WEBSITE</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <WebsiteIcon domain={domain} iconUrl={iconUrl} name={form.name || domain} size={36} />
              <input
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="github.com"
                style={{ ...field, flex: 1 }}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabel}>FOLDER</label>
            <select
              value={form.folderId}
              onChange={(e) => setForm((f) => ({ ...f, folderId: e.target.value }))}
              style={field}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {onCreateFolder ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value)}
                  placeholder="New folder name"
                  style={{ ...field, flex: 1 }}
                />
                <button
                  type="button"
                  disabled={!newFolder.trim()}
                  onClick={() => {
                    void (async () => {
                      await onCreateFolder(newFolder.trim());
                      setNewFolder("");
                    })();
                  }}
                  style={{
                    height: 42,
                    padding: "0 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Add
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label style={fieldLabel}>TAGS</label>
            <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
          </div>

          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, favorite: !f.favorite }))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              height: 36,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: form.favorite ? "rgba(251,191,36,0.12)" : "transparent",
              color: form.favorite ? "#fde68a" : "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Star
              style={{
                width: 14,
                height: 14,
                fill: form.favorite ? "#fbbf24" : "none",
                color: form.favorite ? "#fbbf24" : "currentColor",
              }}
            />
            {form.favorite ? "Favorite" : "Add to favorites"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42,
              padding: "0 16px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 650,
              opacity: saving || !form.name.trim() ? 0.6 : 1,
            }}
          >
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
