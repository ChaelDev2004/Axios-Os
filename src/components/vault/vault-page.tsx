"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  FolderPlus,
  Lock,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

import { CredentialDialog } from "@/components/vault/credential-dialog";
import { VaultCard } from "@/components/vault/vault-card";
import { VaultLockScreen } from "@/components/vault/vault-lock-screen";
import { confirmDeleteCredential } from "@/features/vault/lib/confirm-delete";
import {
  useCreateVaultCredential,
  useCreateVaultFolder,
  useDeleteVaultCredential,
  useDeleteVaultFolder,
  useToggleVaultFavorite,
  useUpdateVaultCredential,
  useVaultCredentials,
  useVaultFolders,
} from "@/features/vault/hooks/use-vault";
import { useVaultLockStore } from "@/features/vault/stores/vault-lock.store";
import type {
  DecryptedVaultCredential,
  VaultCredentialInput,
  VaultSortOption,
  VaultTypeFilter,
} from "@/features/vault/types";
import { VAULT_FILTER_CHIPS } from "@/features/vault/types";

const chipBase: CSSProperties = {
  appearance: "none",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  background: "transparent",
  color: "var(--muted-foreground)",
};

export function VaultPage() {
  const unlocked = useVaultLockStore((s) => s.unlocked);
  const lock = useVaultLockStore((s) => s.lock);
  const touch = useVaultLockStore((s) => s.touch);
  const checkAutoLock = useVaultLockStore((s) => s.checkAutoLock);
  const autoLockMinutes = useVaultLockStore((s) => s.autoLockMinutes);
  const setAutoLockMinutes = useVaultLockStore((s) => s.setAutoLockMinutes);

  const { data: credentials = [], isLoading } = useVaultCredentials();
  const { data: folders = [] } = useVaultFolders();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<VaultTypeFilter>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sort, setSort] = useState<VaultSortOption>("updated_desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DecryptedVaultCredential | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    const onActivity = () => touch();
    const events = ["pointerdown", "keydown", "mousemove", "scroll", "touchstart"] as const;
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true });
    const interval = window.setInterval(() => checkAutoLock(), 15_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") checkAutoLock();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [unlocked, touch, checkAutoLock]);

  const createMut = useCreateVaultCredential({
    onSuccess: () => {
      toast.success("Credential saved");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = useUpdateVaultCredential({
    onSuccess: () => {
      toast.success("Credential updated");
      setDialogOpen(false);
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = useDeleteVaultCredential({
    onSuccess: () => toast.success("Credential deleted"),
    onError: (e) => toast.error(e.message),
  });
  const favoriteMut = useToggleVaultFavorite({
    onError: (e) => toast.error(e.message),
  });
  const createFolderMut = useCreateVaultFolder({
    onSuccess: () => toast.success("Folder created"),
    onError: (e) => toast.error(e.message),
  });
  const deleteFolderMut = useDeleteVaultFolder({
    onSuccess: () => {
      toast.success("Folder deleted");
      setFolderFilter("all");
    },
    onError: (e) => toast.error(e.message),
  });

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of credentials) for (const t of c.tags) set.add(t);
    return [...set].sort();
  }, [credentials]);

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of folders) map.set(f.id, f.name);
    return map;
  }, [folders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = credentials.filter((c) => {
      if (typeFilter === "favorites" && !c.favorite) return false;
      if (
        typeFilter !== "all" &&
        typeFilter !== "favorites" &&
        c.type !== typeFilter
      ) {
        return false;
      }
      if (folderFilter !== "all" && c.folderId !== folderFilter) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      const hay = [
        c.name,
        c.username ?? "",
        c.website ?? "",
        c.domain ?? "",
        c.type,
        c.folderId ? folderNameById.get(c.folderId) ?? "" : "",
        ...c.tags,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "created_desc":
          return b.createdAt.localeCompare(a.createdAt);
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "favorites":
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          return b.updatedAt.localeCompare(a.updatedAt);
        case "website":
          return (a.domain ?? "").localeCompare(b.domain ?? "");
        case "updated_desc":
        default:
          if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
          return b.updatedAt.localeCompare(a.updatedAt);
      }
    });

    return rows;
  }, [credentials, query, typeFilter, folderFilter, tagFilter, sort, folderNameById]);

  if (!unlocked) {
    return <VaultLockScreen />;
  }

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (c: DecryptedVaultCredential) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const save = (input: VaultCredentialInput) => {
    if (editing) {
      updateMut.mutate({ id: editing.id, input });
    } else {
      createMut.mutate(input);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div className="axion-kicker" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Shield style={{ width: 12, height: 12 }} />
              VAULT
            </div>
            <h1 className="axion-subtitle" style={{ marginTop: 6 }}>
              Your secure credentials
            </h1>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <select
              value={autoLockMinutes}
              onChange={(e) =>
                void setAutoLockMinutes(Number(e.target.value) as 0 | 1 | 5 | 15 | 30)
              }
              aria-label="Auto-lock"
              style={{
                height: 36,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
                color: "var(--foreground)",
                padding: "0 10px",
                fontSize: 12,
              }}
            >
              <option value={1}>Auto-lock 1m</option>
              <option value={5}>Auto-lock 5m</option>
              <option value={15}>Auto-lock 15m</option>
              <option value={30}>Auto-lock 30m</option>
              <option value={0}>Never lock</option>
            </select>
            <button
              type="button"
              onClick={() => lock()}
              style={{
                display: "inline-flex",
                height: 36,
                alignItems: "center",
                gap: 6,
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--foreground)",
                padding: "0 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Lock style={{ width: 14, height: 14 }} />
              Lock
            </button>
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: "inline-flex",
                height: 36,
                alignItems: "center",
                gap: 6,
                borderRadius: 12,
                border: "none",
                background: "#6366f1",
                color: "#fff",
                padding: "0 14px",
                fontSize: 12,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: 14, height: 14 }} />
              New
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 42,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
            padding: "0 12px",
          }}
        >
          <Search style={{ width: 16, height: 16, color: "var(--muted-foreground)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search credentials..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 14,
            }}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {VAULT_FILTER_CHIPS.map((chip) => {
            const active = typeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setTypeFilter(chip.id)}
                style={{
                  ...chipBase,
                  background: active
                    ? "linear-gradient(135deg, #6366f1, #4f46e5)"
                    : "transparent",
                  color: active ? "#fff" : "var(--muted-foreground)",
                  borderColor: active ? "transparent" : "var(--border)",
                }}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr 1fr auto",
            alignItems: "center",
          }}
        >
          <select
            value={folderFilter}
            onChange={(e) => setFolderFilter(e.target.value)}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
              color: "var(--foreground)",
              padding: "0 10px",
              fontSize: 13,
            }}
          >
            <option value="all">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
              color: "var(--foreground)",
              padding: "0 10px",
              fontSize: 13,
            }}
          >
            <option value="all">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as VaultSortOption)}
            style={{
              height: 38,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--foreground) 3%, transparent)",
              color: "var(--foreground)",
              padding: "0 10px",
              fontSize: 13,
            }}
          >
            <option value="updated_desc">Recently Updated</option>
            <option value="created_desc">Recently Added</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="favorites">Favorites</option>
            <option value="website">Website</option>
          </select>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("Folder name");
              if (name?.trim()) createFolderMut.mutate(name.trim());
            }}
            style={{
              display: "inline-flex",
              height: 38,
              alignItems: "center",
              gap: 6,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground)",
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <FolderPlus style={{ width: 14, height: 14 }} />
            Folder
          </button>
        </div>

        {folderFilter !== "all" ? (
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const folder = folders.find((f) => f.id === folderFilter);
                const ok = window.confirm(
                  `Delete folder "${folder?.name ?? ""}"? Credentials will be kept (unassigned).`
                );
                if (ok) deleteFolderMut.mutate(folderFilter);
              })();
            }}
            style={{
              alignSelf: "flex-start",
              border: "none",
              background: "transparent",
              color: "#fca5a5",
              fontSize: 12,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Delete selected folder
          </button>
        ) : null}
      </section>

      <section className="axion-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isLoading ? (
          <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14 }}>
            Decrypting credentials…
          </p>
        ) : filtered.length === 0 && credentials.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 12,
              padding: "36px 16px",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "rgba(99,102,241,0.15)",
                color: "#a5b4fc",
              }}
            >
              <Shield style={{ width: 24, height: 24 }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 650 }}>Your Vault is empty</h3>
            <p style={{ margin: 0, maxWidth: 360, color: "var(--muted-foreground)", fontSize: 14 }}>
              Secure your first credential and keep your important accounts in one place.
            </p>
            <button
              type="button"
              onClick={openCreate}
              style={{
                display: "inline-flex",
                height: 40,
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: "none",
                background: "#6366f1",
                color: "#fff",
                padding: "0 16px",
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: 16, height: 16 }} />
              Add Credential
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted-foreground)", fontSize: 14 }}>
            No credentials match your filters.
          </p>
        ) : (
          filtered.map((c) => (
            <VaultCard
              key={c.id}
              credential={c}
              folderName={c.folderId ? folderNameById.get(c.folderId) : null}
              compactActions={isNarrow}
              onEdit={() => openEdit(c)}
              onToggleFavorite={() =>
                favoriteMut.mutate({ id: c.id, favorite: !c.favorite })
              }
              onDelete={() => {
                void (async () => {
                  const ok = await confirmDeleteCredential(c.name);
                  if (ok) deleteMut.mutate(c.id);
                })();
              }}
            />
          ))
        )}
      </section>

      <CredentialDialog
        open={dialogOpen}
        mode={editing ? "edit" : "create"}
        initial={editing}
        folders={folders}
        saving={createMut.isPending || updateMut.isPending}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={save}
        onCreateFolder={async (name) => {
          await createFolderMut.mutateAsync(name);
        }}
      />
    </div>
  );
}
