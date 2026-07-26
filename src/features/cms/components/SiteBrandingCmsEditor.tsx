"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useSiteBranding,
  useUpsertSiteBranding,
} from "@/features/cms/hooks/use-site-branding";
import {
  siteBrandingToInput,
  type SiteBrandingInput,
} from "@/features/cms/services/site-branding.service";
import { DEFAULT_SITE_BRANDING } from "@/lib/site-branding-defaults";

function emptyForm(): SiteBrandingInput {
  return {
    appName: DEFAULT_SITE_BRANDING.appName,
    pageTitle: DEFAULT_SITE_BRANDING.pageTitle,
    faviconUrl: DEFAULT_SITE_BRANDING.faviconUrl,
  };
}

function appInitials(appName: string): string {
  const parts = appName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "AO";
}

export function SiteBrandingCmsEditor() {
  const { data, isLoading } = useSiteBranding();
  const save = useUpsertSiteBranding({
    onSuccess: () => toast.success("AXIOS OS branding updated"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<SiteBrandingInput>(emptyForm);

  useEffect(() => {
    if (data) {
      setForm(siteBrandingToInput(data));
    }
  }, [data]);

  const previewInitials = useMemo(
    () => appInitials(form.appName.trim() || DEFAULT_SITE_BRANDING.appName),
    [form.appName]
  );
  const previewAppName = form.appName.trim() || DEFAULT_SITE_BRANDING.appName;

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">AXIOS OS</div>
      <h2 className="axion-title">App branding</h2>
      <p className="axion-body">
        Change the app name, browser tab title, and favicon URL for AXIOS OS.
      </p>

      {isLoading ? (
        <p className="axion-meta mt-4">Loading branding…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="mt-6 space-y-5"
        >
          <div className="axion-soft">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Top bar preview
            </p>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-[11px] font-bold text-white shadow-lg shadow-indigo-500/25">
                {previewInitials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight text-foreground">
                  Overview
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {previewAppName}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand-app-name">App name</Label>
              <Input
                id="brand-app-name"
                value={form.appName}
                onChange={(e) => setForm((prev) => ({ ...prev, appName: e.target.value }))}
                placeholder={DEFAULT_SITE_BRANDING.appName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-page-title">Browser title</Label>
              <Input
                id="brand-page-title"
                value={form.pageTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, pageTitle: e.target.value }))}
                placeholder={DEFAULT_SITE_BRANDING.pageTitle}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand-favicon">Favicon URL</Label>
            <Input
              id="brand-favicon"
              value={form.faviconUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
              placeholder="/assets/appLogo/axiosLogo.png or https://cdn.example.com/icon.png"
            />
            {form.faviconUrl.trim() ? (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={form.faviconUrl.trim()}
                  alt=""
                  className="h-12 w-12 rounded border border-white/10 bg-white/5 object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-slate-500">Favicon preview</span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save branding"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>
              Reset to AXIOS OS defaults
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
