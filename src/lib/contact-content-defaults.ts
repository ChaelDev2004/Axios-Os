import {
  CONTACT_EMAIL,
  CONTACT_INTRO,
  CONTACT_MARQUEE_ITEMS,
  CONTACT_PHONE,
  SOCIALS,
  type SocialLink,
} from "@/lib/socials";

export type ContactSocialLink = SocialLink;

export const DEFAULT_CONTACT_CONTENT = {
  subTitle: "You Dream It, I Code it",
  title: "Contact",
  intro: CONTACT_INTRO,
  email: CONTACT_EMAIL,
  phone: CONTACT_PHONE,
  socials: SOCIALS.map((social) => ({ ...social })),
  marqueeItems: [...CONTACT_MARQUEE_ITEMS],
} as const;

export type ContactContent = {
  subTitle: string;
  title: string;
  intro: string;
  email: string;
  phone: string;
  socials: ContactSocialLink[];
  marqueeItems: string[];
};

export type ContactContentRow = {
  id: string;
  section_subtitle: string;
  section_title: string;
  section_intro: string;
  email: string;
  phone: string;
  socials: unknown;
  marquee_items: unknown;
  updated_at: string;
  updated_by: string | null;
};

function normalizeSocials(raw: unknown): ContactSocialLink[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CONTACT_CONTENT.socials.map((social) => ({ ...social }));
  }

  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const fallback = DEFAULT_CONTACT_CONTENT.socials[index];
      const name =
        typeof record.name === "string" && record.name.trim()
          ? record.name.trim()
          : fallback?.name ?? `Social ${index + 1}`;
      let href =
        typeof record.href === "string" ? record.href.trim() : fallback?.href ?? "";

      // Upgrade placeholder LinkedIn homepage links to the real profile default.
      if (
        name.toLowerCase() === "linkedin" &&
        (!href ||
          href === "https://linkedin.com/" ||
          href === "https://www.linkedin.com/" ||
          href === "https://linkedin.com")
      ) {
        href =
          DEFAULT_CONTACT_CONTENT.socials.find((s) => s.name === "LinkedIn")
            ?.href ?? href;
      }

      if (!name) return null;
      return { name, href };
    })
    .filter((item): item is ContactSocialLink => item !== null);
}

function normalizeStringArray(raw: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...fallback];
  }

  const items = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  return items.length > 0 ? items : [...fallback];
}

export function mergeContactContent(row: ContactContentRow | null | undefined): ContactContent {
  if (!row) {
    return {
      subTitle: DEFAULT_CONTACT_CONTENT.subTitle,
      title: DEFAULT_CONTACT_CONTENT.title,
      intro: DEFAULT_CONTACT_CONTENT.intro,
      email: DEFAULT_CONTACT_CONTENT.email,
      phone: DEFAULT_CONTACT_CONTENT.phone,
      socials: DEFAULT_CONTACT_CONTENT.socials.map((social) => ({ ...social })),
      marqueeItems: [...DEFAULT_CONTACT_CONTENT.marqueeItems],
    };
  }

  return {
    subTitle: row.section_subtitle?.trim() || DEFAULT_CONTACT_CONTENT.subTitle,
    title: row.section_title?.trim() || DEFAULT_CONTACT_CONTENT.title,
    intro: row.section_intro?.trim() || DEFAULT_CONTACT_CONTENT.intro,
    email: row.email?.trim() || DEFAULT_CONTACT_CONTENT.email,
    phone: row.phone?.trim() || DEFAULT_CONTACT_CONTENT.phone,
    socials: normalizeSocials(row.socials),
    marqueeItems: normalizeStringArray(row.marquee_items, DEFAULT_CONTACT_CONTENT.marqueeItems),
  };
}
