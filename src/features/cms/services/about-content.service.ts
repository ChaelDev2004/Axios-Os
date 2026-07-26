import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_ABOUT_CONTENT,
  mergeAboutContent,
  type AboutContent,
} from "@/lib/about-content-defaults";
import type { Database } from "@/features/auth/types/database.types";
import { requireAdminId } from "@/features/cms/services/cms-auth";

type AboutContentUpdate = Database["public"]["Tables"]["about_content"]["Update"];

export type AboutContentInput = {
  leadText: string;
  hireButtonLabel: string;
  cvButtonLabel: string;
  cvUrl: string;
  cvFileName: string;
  cvRedirectUrl: string;
  lanyardHint: string;
  feature1Num: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Num: string;
  feature2Title: string;
  feature2Desc: string;
  feature3Num: string;
  feature3Title: string;
  feature3Desc: string;
  feature4Num: string;
  feature4Title: string;
  feature4Desc: string;
};

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchAboutContent(): Promise<AboutContent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("about_content")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return mergeAboutContent(null);
  }

  return mergeAboutContent(data);
}

export function aboutContentToInput(content: AboutContent): AboutContentInput {
  const [f1, f2, f3, f4] = content.features;

  return {
    leadText: content.leadText,
    hireButtonLabel: content.hireButtonLabel,
    cvButtonLabel: content.cvButtonLabel,
    cvUrl: content.cvUrl,
    cvFileName: content.cvFileName,
    cvRedirectUrl: content.cvRedirectUrl,
    lanyardHint: content.lanyardHint,
    feature1Num: f1.num,
    feature1Title: f1.title,
    feature1Desc: f1.desc,
    feature2Num: f2.num,
    feature2Title: f2.title,
    feature2Desc: f2.desc,
    feature3Num: f3.num,
    feature3Title: f3.title,
    feature3Desc: f3.desc,
    feature4Num: f4.num,
    feature4Title: f4.title,
    feature4Desc: f4.desc,
  };
}

export function aboutInputToRow(
  input: AboutContentInput,
  userId: string
): AboutContentUpdate & { id: string; updated_by: string } {
  const [d1, d2, d3, d4] = DEFAULT_ABOUT_CONTENT.features;

  return {
    id: "default",
    lead_text: input.leadText.trim() || DEFAULT_ABOUT_CONTENT.leadText,
    hire_button_label:
      input.hireButtonLabel.trim() || DEFAULT_ABOUT_CONTENT.hireButtonLabel,
    cv_button_label:
      input.cvButtonLabel.trim() || DEFAULT_ABOUT_CONTENT.cvButtonLabel,
    cv_url: input.cvUrl.trim(),
    cv_file_name: input.cvFileName.trim(),
    cv_redirect_url: input.cvRedirectUrl.trim(),
    lanyard_hint: input.lanyardHint.trim() || DEFAULT_ABOUT_CONTENT.lanyardHint,
    feature_1_num: input.feature1Num.trim() || d1.num,
    feature_1_title: input.feature1Title.trim() || d1.title,
    feature_1_desc: input.feature1Desc.trim() || d1.desc,
    feature_2_num: input.feature2Num.trim() || d2.num,
    feature_2_title: input.feature2Title.trim() || d2.title,
    feature_2_desc: input.feature2Desc.trim() || d2.desc,
    feature_3_num: input.feature3Num.trim() || d3.num,
    feature_3_title: input.feature3Title.trim() || d3.title,
    feature_3_desc: input.feature3Desc.trim() || d3.desc,
    feature_4_num: input.feature4Num.trim() || d4.num,
    feature_4_title: input.feature4Title.trim() || d4.title,
    feature_4_desc: input.feature4Desc.trim() || d4.desc,
    updated_by: userId,
  };
}

export async function upsertAboutContent(
  input: AboutContentInput
): Promise<AboutContent> {
  const userId = await requireAdminId();
  const supabase = createClient();
  const row = aboutInputToRow(input, userId);

  const { data, error } = await supabase
    .from("about_content")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  throwOnError(error);
  return mergeAboutContent(data);
}
