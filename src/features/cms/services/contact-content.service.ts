import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/features/auth/types/database.types";
import { requireAdminId } from "@/features/cms/services/cms-auth";
import {
  DEFAULT_CONTACT_CONTENT,
  mergeContactContent,
  type ContactContent,
} from "@/lib/contact-content-defaults";

type ContactContentUpdate = Database["public"]["Tables"]["contact_content"]["Update"];

export type ContactSocialFormItem = {
  name: string;
  href: string;
};

export type ContactContentInput = {
  subTitle: string;
  title: string;
  intro: string;
  email: string;
  phone: string;
  socials: ContactSocialFormItem[];
  marqueeItemsInput: string;
};

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

export function parseMarqueeItemsInput(input: string): string[] {
  return input
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function formatMarqueeItemsInput(items: string[]): string {
  return items.join("\n");
}

export async function fetchContactContent(): Promise<ContactContent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact_content")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return mergeContactContent(null);
  }

  return mergeContactContent(data);
}

export function contactContentToInput(content: ContactContent): ContactContentInput {
  return {
    subTitle: content.subTitle,
    title: content.title,
    intro: content.intro,
    email: content.email,
    phone: content.phone,
    socials: content.socials.map((social) => ({ ...social })),
    marqueeItemsInput: formatMarqueeItemsInput(content.marqueeItems),
  };
}

export function contactInputToRow(
  input: ContactContentInput,
  userId: string
): ContactContentUpdate & { id: string; updated_by: string } {
  const marqueeItems = parseMarqueeItemsInput(input.marqueeItemsInput);

  return {
    id: "default",
    section_subtitle: input.subTitle.trim() || DEFAULT_CONTACT_CONTENT.subTitle,
    section_title: input.title.trim() || DEFAULT_CONTACT_CONTENT.title,
    section_intro: input.intro.trim() || DEFAULT_CONTACT_CONTENT.intro,
    email: input.email.trim() || DEFAULT_CONTACT_CONTENT.email,
    phone: input.phone.trim() || DEFAULT_CONTACT_CONTENT.phone,
    socials: input.socials
      .map((social) => ({
        name: social.name.trim(),
        href: social.href.trim(),
      }))
      .filter((social) => social.name),
    marquee_items:
      marqueeItems.length > 0 ? marqueeItems : [...DEFAULT_CONTACT_CONTENT.marqueeItems],
    updated_by: userId,
  };
}

export async function upsertContactContent(input: ContactContentInput): Promise<ContactContent> {
  const userId = await requireAdminId();
  const supabase = createClient();
  const row = contactInputToRow(input, userId);

  const { data, error } = await supabase
    .from("contact_content")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  throwOnError(error);
  return mergeContactContent(data);
}

export function newEmptySocialItem(): ContactSocialFormItem {
  return { name: "", href: "" };
}
