"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarAvatar } from "@/components/axion/sidebar-profile-editor";
import { updateProfileAction } from "@/features/auth/actions/auth.actions";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function AccountProfileEditor() {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
  }, [profile]);

  if (!profile) return null;

  const email = user?.email ?? profile.email ?? "";
  const previewName = fullName.trim() || profile.full_name || "User";

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
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
    } catch {
      toast.error("Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="axion-card">
      <div className="axion-kicker">Account</div>
      <h2 className="axion-title">Your profile</h2>
      <p className="axion-body">
        Update your display name and profile image. Changes show in the sidebar and top bar.
      </p>

      <form onSubmit={(e) => void onSave(e)} className="mt-6 space-y-5">
        <div className="axion-soft flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative">
            <SidebarAvatar
              name={previewName}
              avatarUrl={avatarUrl.trim() || null}
              className="h-16 w-16 text-lg"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-[#151824] text-slate-300">
              <Camera className="h-3 w-3" />
            </span>
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="truncate text-sm font-semibold text-foreground">{previewName}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="admin-profile-name">Account name</Label>
            <Input
              id="admin-profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-profile-avatar">Profile image URL</Label>
            <Input
              id="admin-profile-avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://cdn.example.com/avatar.png"
              disabled={saving}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Paste an image link. Leave empty to use initials.
        </p>

        <Button type="submit" disabled={saving || fullName.trim().length < 2}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
