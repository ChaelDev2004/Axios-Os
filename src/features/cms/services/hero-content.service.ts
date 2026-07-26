import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_HERO_CONTENT,
  mergeHeroContent,
  parseRotatingWordsInput,
  type HeroContent,
} from "@/lib/hero-content-defaults";
import type { Database } from "@/features/auth/types/database.types";
import { requireAdminId } from "@/features/cms/services/cms-auth";

type HeroContentUpdate = Database["public"]["Tables"]["hero_content"]["Update"];

export type HeroContentInput = {
  termTag: string;
  headlineTop: string;
  rotatingWordsInput: string;
  bioName: string;
  bioBody: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
};

function throwOnError(error: { message: string } | null): asserts error is null {
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchHeroContent(): Promise<HeroContent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hero_content")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return mergeHeroContent(null);
  }

  return mergeHeroContent(data);
}

export function heroContentToInput(content: HeroContent): Omit<HeroContentInput, never> & {
  rotatingWordsInput: string;
} {
  return {
    termTag: content.termTag,
    headlineTop: content.headlineTop,
    rotatingWordsInput: content.rotatingWords.join(", "),
    bioName: content.bioName,
    bioBody: content.bioBody,
    stat1Value: content.stats[0].value,
    stat1Label: content.stats[0].label,
    stat2Value: content.stats[1].value,
    stat2Label: content.stats[1].label,
    stat3Value: content.stats[2].value,
    stat3Label: content.stats[2].label,
  };
}

export function heroInputToRow(
  input: HeroContentInput,
  userId: string
): HeroContentUpdate & { id: string; updated_by: string } {
  const rotatingWords = parseRotatingWordsInput(input.rotatingWordsInput);

  return {
    id: "default",
    term_tag: input.termTag.trim() || DEFAULT_HERO_CONTENT.termTag,
    headline_top: input.headlineTop.trim() || DEFAULT_HERO_CONTENT.headlineTop,
    rotating_words:
      rotatingWords.length > 0
        ? rotatingWords
        : [...DEFAULT_HERO_CONTENT.rotatingWords],
    bio_name: input.bioName.trim() || DEFAULT_HERO_CONTENT.bioName,
    bio_body: input.bioBody.trim() || DEFAULT_HERO_CONTENT.bioBody,
    stat_1_value: input.stat1Value.trim() || DEFAULT_HERO_CONTENT.stats[0].value,
    stat_1_label: input.stat1Label.trim() || DEFAULT_HERO_CONTENT.stats[0].label,
    stat_2_value: input.stat2Value.trim() || DEFAULT_HERO_CONTENT.stats[1].value,
    stat_2_label: input.stat2Label.trim() || DEFAULT_HERO_CONTENT.stats[1].label,
    stat_3_value: input.stat3Value.trim() || DEFAULT_HERO_CONTENT.stats[2].value,
    stat_3_label: input.stat3Label.trim() || DEFAULT_HERO_CONTENT.stats[2].label,
    updated_by: userId,
  };
}

export async function upsertHeroContent(input: HeroContentInput): Promise<HeroContent> {
  const userId = await requireAdminId();
  const supabase = createClient();
  const row = heroInputToRow(input, userId);

  const { data, error } = await supabase
    .from("hero_content")
    .upsert(row, { onConflict: "id" })
    .select("*")
    .single();

  throwOnError(error);
  return mergeHeroContent(data);
}
