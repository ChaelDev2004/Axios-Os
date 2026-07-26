export const APP_LOGO_URL = "/assets/appLogo/axiosLogo.png";

export const DEFAULT_SITE_BRANDING = {
  appName: "AXIOS OS",
  pageTitle: "AXIOS OS",
  faviconUrl: APP_LOGO_URL,
} as const;

export type SiteBranding = {
  appName: string;
  pageTitle: string;
  faviconUrl: string;
};

export type SiteBrandingRow = {
  id: string;
  app_name: string;
  page_title: string;
  favicon_url: string;
  updated_at: string;
  updated_by: string | null;
};

export function mergeSiteBranding(row: SiteBrandingRow | null | undefined): SiteBranding {
  if (!row) {
    return {
      appName: DEFAULT_SITE_BRANDING.appName,
      pageTitle: DEFAULT_SITE_BRANDING.pageTitle,
      faviconUrl: DEFAULT_SITE_BRANDING.faviconUrl,
    };
  }

  return {
    appName: row.app_name?.trim() || DEFAULT_SITE_BRANDING.appName,
    pageTitle: row.page_title?.trim() || DEFAULT_SITE_BRANDING.pageTitle,
    faviconUrl: row.favicon_url?.trim() || DEFAULT_SITE_BRANDING.faviconUrl,
  };
}
