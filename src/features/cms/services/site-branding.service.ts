import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/features/auth/types/database.types";
import { requireAdminId } from "@/features/cms/services/cms-auth";
import {
  DEFAULT_SITE_BRANDING,
  mergeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding-defaults";

type SiteBrandingUpdate = Database["public"]["Tables"]["site_branding"]["Update"];

export type SiteBrandingInput = {
  appName: string;
  pageTitle: string;
  faviconUrl: string;
};

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchSiteBranding(): Promise<SiteBranding> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("site_branding")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return mergeSiteBranding(null);
  }

  return mergeSiteBranding(data);
}

export function siteBrandingToInput(content: SiteBranding): SiteBrandingInput {
  return {
    appName: content.appName,
    pageTitle: content.pageTitle,
    faviconUrl: content.faviconUrl,
  };
}

export function siteBrandingInputToRow(
  input: SiteBrandingInput,
  userId: string
): SiteBrandingUpdate & { id: string; updated_by: string } {
  return {
    id: "default",
    app_name: input.appName.trim() || DEFAULT_SITE_BRANDING.appName,
    page_title: input.pageTitle.trim() || DEFAULT_SITE_BRANDING.pageTitle,
    favicon_url: input.faviconUrl.trim() || DEFAULT_SITE_BRANDING.faviconUrl,
    updated_by: userId,
  };
}

export async function upsertSiteBranding(input: SiteBrandingInput): Promise<SiteBranding> {
  const userId = await requireAdminId();
  const supabase = createClient();
  const row = siteBrandingInputToRow(input, userId);

  const { data, error } = await supabase
    .from("site_branding")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  throwOnError(error);
  return mergeSiteBranding(data);
}
