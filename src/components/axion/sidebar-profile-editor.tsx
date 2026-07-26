"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, X } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileAction } from "@/features/auth/actions/auth.actions";
import { useAuth } from "@/features/auth/hooks/useAuth";

type SidebarProfileEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function initialsFromName(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10040,
    background: "rgba(0,0,0,0.65)",
    backdropFilter: "blur(12px)",
    border: "none",
    padding: 0,
    cursor: "default",
  },
  dialogWrap: {
    position: "fixed",
    inset: 0,
    zIndex: 10050,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    pointerEvents: "none",
  },
  dialog: {
    width: "min(92vw, 24rem)",
    overflow: "hidden",
    borderRadius: 16,
    border: "1px solid var(--border)",
    background: "var(--background)",
    padding: 0,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
    backdropFilter: "blur(24px)",
    pointerEvents: "auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid var(--border)",
    padding: "12px 16px",
  },
  kicker: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "var(--muted-foreground)",
    margin: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--foreground)",
    margin: "2px 0 0",
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    width: 32,
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--foreground)",
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    padding: 16,
  },
  avatarSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    position: "relative",
  },
  avatarImg: {
    height: 80,
    width: 80,
    borderRadius: "9999px",
    objectFit: "cover",
    boxShadow: "0 0 0 2px rgba(129,140,248,0.3)",
  },
  avatarFallback: {
    display: "flex",
    height: 80,
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    background: "linear-gradient(to bottom right, #6366f1, #d946ef)",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    display: "flex",
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "9999px",
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
  },
  emailText: {
    textAlign: "center",
    fontSize: 12,
    color: "var(--muted-foreground)",
    margin: 0,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    color: "var(--foreground)",
  },
  hint: {
    fontSize: 11,
    color: "var(--muted-foreground)",
    margin: 0,
  },
  actions: {
    display: "flex",
    gap: 8,
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
  },
};

export function SidebarProfileEditor({ open, onOpenChange }: SidebarProfileEditorProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !profile) return;
    setFullName(profile.full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted) return null;

  const email = user?.email ?? profile?.email ?? "";
  const previewName = fullName.trim() || profile?.full_name || "User";
  const previewInitials = initialsFromName(previewName);
  const previewAvatar = avatarUrl.trim();
  const isDark = resolvedTheme !== "light";
  const colors = isDark
    ? {
        surface: "#0c0e16",
        text: "#f8fafc",
        muted: "#94a3b8",
        border: "rgba(255,255,255,0.12)",
        input: "#111827",
        inputBorder: "rgba(255,255,255,0.15)",
        secondary: "#151824",
      }
    : {
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#475569",
        border: "rgba(15,23,42,0.14)",
        input: "#f8fafc",
        inputBorder: "rgba(15,23,42,0.18)",
        secondary: "#f1f5f9",
      };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await updateProfileAction({
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await refreshProfile();
      toast.success(result.message ?? "Profile updated");
      onOpenChange(false);
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close profile editor"
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <div style={styles.dialogWrap}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Edit profile"
              style={{
                ...styles.dialog,
                background: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              }}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ ...styles.header, borderColor: colors.border }}>
                <div>
                  <p style={{ ...styles.kicker, color: colors.muted }}>Account</p>
                  <h2 style={{ ...styles.headerTitle, color: colors.text }}>
                    Edit profile
                  </h2>
                </div>
                <button
                  type="button"
                  style={{
                    ...styles.closeBtn,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  aria-label="Close"
                  onClick={() => onOpenChange(false)}
                >
                  <X style={{ height: 16, width: 16 }} />
                </button>
              </div>

              <div style={styles.body}>
                <div style={styles.avatarSection}>
                  <div style={styles.avatarWrap}>
                    {previewAvatar ? (
                      <img
                        src={previewAvatar}
                        alt=""
                        style={styles.avatarImg}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div style={styles.avatarFallback}>{previewInitials}</div>
                    )}
                    <span
                      style={{
                        ...styles.cameraBadge,
                        background: colors.secondary,
                        borderColor: colors.border,
                        color: colors.text,
                      }}
                    >
                      <Camera style={{ height: 14, width: 14 }} />
                    </span>
                  </div>
                  <p style={{ ...styles.emailText, color: colors.muted }}>
                    {email}
                  </p>
                </div>

                <div style={styles.field}>
                  <Label
                    htmlFor="sidebar-profile-name"
                    style={{ ...styles.fieldLabel, color: colors.text }}
                  >
                    Account name
                  </Label>
                  <Input
                    id="sidebar-profile-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    disabled={saving}
                    style={{
                      background: colors.input,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                      paddingLeft: 16,
                    }}
                  />
                </div>

                <div style={styles.field}>
                  <Label
                    htmlFor="sidebar-profile-avatar"
                    style={{ ...styles.fieldLabel, color: colors.text }}
                  >
                    Profile image URL
                  </Label>
                  <Input
                    id="sidebar-profile-avatar"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://cdn.example.com/avatar.png"
                    disabled={saving}
                    style={{
                      background: colors.input,
                      borderColor: colors.inputBorder,
                      color: colors.text,
                      paddingLeft: 16,
                    }}
                  />
                  <p style={{ ...styles.hint, color: colors.muted }}>
                    Paste an image link. Leave empty to use initials.
                  </p>
                </div>

                <div style={styles.actions}>
                  <Button
                    type="button"
                    variant="outline"
                    style={{
                      ...styles.actionBtn,
                      background: colors.secondary,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    disabled={saving}
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    style={{
                      ...styles.actionBtn,
                      background: "#4f46e5",
                      borderColor: "#4f46e5",
                      color: "#ffffff",
                    }}
                    disabled={saving || fullName.trim().length < 2}
                    onClick={() => void onSave()}
                  >
                    {saving ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

type SidebarAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  style?: CSSProperties;
  size?: "sm" | "md";
};

const avatarSizeStyles: Record<"sm" | "md", CSSProperties> = {
  sm: { height: 36, width: 36, fontSize: 12 },
  md: { height: 40, width: 40, fontSize: 14 },
};

export function SidebarAvatar({
  name,
  avatarUrl,
  className,
  style,
  size = "md",
}: SidebarAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = initialsFromName(name);
  const src = avatarUrl?.trim() ?? "";
  const showImage = Boolean(src) && !imgFailed;

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  if (showImage) {
    return (
      <img
        src={src}
        alt=""
        className={className}
        style={{
          flexShrink: 0,
          borderRadius: "9999px",
          objectFit: "cover",
          boxShadow: "0 0 0 1px var(--border)",
          ...avatarSizeStyles[size],
          ...style,
        }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        background: "linear-gradient(to bottom right, #6366f1, #d946ef)",
        color: "#fff",
        fontWeight: 700,
        ...avatarSizeStyles[size],
        ...style,
      }}
      aria-hidden
    >
      {initials[0]}
    </div>
  );
}