"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { WebsiteIcon } from "@/components/vault/website-icon";
import { copySecure } from "@/features/vault/lib/clipboard";
import { openWebsiteUrl } from "@/features/vault/lib/url";
import type { DecryptedVaultCredential, VaultFolder } from "@/features/vault/types";
import { VAULT_TYPE_LABELS } from "@/features/vault/types";

type VaultCardProps = {
  credential: DecryptedVaultCredential;
  folderName?: string | null;
  compactActions?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
};

const card: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  width: "100%",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid color-mix(in srgb, var(--foreground) 7%, transparent)",
  background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
  textAlign: "left",
};

const menuItemStyle: CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  cursor: "pointer",
  borderRadius: 8,
  outline: "none",
  color: "var(--foreground)",
};

function ActionIconButton({
  label,
  onClick,
  children,
  favorite,
  danger,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  favorite?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      className={[
        "vault-icon-btn",
        favorite ? "is-favorite" : "",
        danger ? "is-danger" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function VaultCard({
  credential,
  folderName,
  compactActions = false,
  onEdit,
  onDelete,
  onToggleFavorite,
}: VaultCardProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!revealed) return;
    const t = window.setTimeout(() => setRevealed(false), 10_000);
    return () => window.clearTimeout(t);
  }, [revealed]);

  const subtitle = useMemo(() => {
    return (
      credential.username ||
      credential.domain ||
      VAULT_TYPE_LABELS[credential.type] ||
      "Credential"
    );
  }, [credential]);

  const secretLabel =
    credential.type === "api_key"
      ? "API key"
      : credential.type === "wifi"
        ? "Wi-Fi password"
        : "Password";

  const openSite = () => {
    const url = openWebsiteUrl(credential.website);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const moreMenu = (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="vault-icon-btn"
          aria-label="More actions"
          title="More actions"
        >
          <MoreHorizontal aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          style={{
            zIndex: 60,
            minWidth: 160,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--background)",
            padding: 6,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          }}
        >
          <DropdownMenu.Item style={menuItemStyle} onSelect={onEdit}>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item style={menuItemStyle} onSelect={onToggleFavorite}>
            {credential.favorite ? "Unfavorite" : "Favorite"}
          </DropdownMenu.Item>
          {credential.username ? (
            <DropdownMenu.Item
              style={menuItemStyle}
              onSelect={() => void copySecure(credential.username ?? "", "Username")}
            >
              Copy username
            </DropdownMenu.Item>
          ) : null}
          {credential.secret ? (
            <DropdownMenu.Item
              style={menuItemStyle}
              onSelect={() => void copySecure(credential.secret ?? "", secretLabel)}
            >
              Copy {secretLabel}
            </DropdownMenu.Item>
          ) : null}
          {credential.website ? (
            <DropdownMenu.Item style={menuItemStyle} onSelect={openSite}>
              Open website
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Item
            style={{ ...menuItemStyle, color: "#fca5a5" }}
            onSelect={onDelete}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );

  return (
    <div style={card}>
      <WebsiteIcon
        domain={credential.domain}
        iconUrl={credential.iconUrl}
        name={credential.name}
        size={40}
        fallback={credential.website ? "letter" : "key"}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--foreground)",
            }}
          >
            {credential.name}
          </div>
          {credential.favorite ? (
            <Star
              aria-hidden
              style={{
                width: 12,
                height: 12,
                color: "#fbbf24",
                fill: "#fbbf24",
                stroke: "#fbbf24",
                flexShrink: 0,
              }}
            />
          ) : null}
        </div>
        <div
          style={{
            marginTop: 2,
            fontSize: 12,
            color: "var(--muted-foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {credential.domain ? `${credential.domain} · ` : ""}
          {subtitle}
          {folderName ? ` · ${folderName}` : ""}
        </div>
        {credential.secret ? (
          <div
            style={{
              marginTop: 6,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              color: revealed ? "var(--foreground)" : "var(--muted-foreground)",
              letterSpacing: revealed ? "normal" : "0.12em",
            }}
          >
            {revealed ? credential.secret : "••••••••••••"}
          </div>
        ) : null}
        {credential.tags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
            {credential.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  borderRadius: 999,
                  border: "1px solid var(--border)",
                  padding: "1px 7px",
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {credential.secret ? (
          <ActionIconButton
            label={revealed ? "Hide secret" : "Show secret"}
            onClick={() => setRevealed((v) => !v)}
          >
            {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </ActionIconButton>
        ) : null}
        {credential.username ? (
          <ActionIconButton
            label="Copy username"
            onClick={() => void copySecure(credential.username ?? "", "Username")}
          >
            <Copy aria-hidden />
          </ActionIconButton>
        ) : null}
        {credential.secret ? (
          <ActionIconButton
            label={`Copy ${secretLabel}`}
            onClick={() => void copySecure(credential.secret ?? "", secretLabel)}
          >
            <Copy aria-hidden />
          </ActionIconButton>
        ) : null}
        {credential.website ? (
          <ActionIconButton label="Open website" onClick={openSite}>
            <ExternalLink aria-hidden />
          </ActionIconButton>
        ) : null}
        <ActionIconButton
          label={credential.favorite ? "Unfavorite" : "Favorite"}
          onClick={onToggleFavorite}
          favorite={credential.favorite}
        >
          <Star aria-hidden />
        </ActionIconButton>
        {!compactActions ? (
          <>
            <ActionIconButton label="Edit" onClick={onEdit}>
              <Pencil aria-hidden />
            </ActionIconButton>
            <ActionIconButton label="Delete" onClick={onDelete} danger>
              <Trash2 aria-hidden />
            </ActionIconButton>
          </>
        ) : (
          moreMenu
        )}
      </div>
    </div>
  );
}

export type { VaultFolder };
