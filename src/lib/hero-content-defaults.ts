export const DEFAULT_HERO_CONTENT = {
  termTag: "Full Stack Developer",
  headlineTop: "Create with",
  rotatingWords: ["INTENT", "PURPOSE", "IMPACT"],
  bioName: "Chael",
  bioBody:
    "a Full Stack Developer specializing in modern web development, turning ideas into fast, secure, and engaging digital experiences.",
  stats: [
    { value: "50+", label: "Projects" },
    { value: "5yr", label: "Experience" },
    { value: "∞", label: "Coffee" },
  ],
} as const;

export type HeroContent = {
  termTag: string;
  headlineTop: string;
  rotatingWords: string[];
  bioName: string;
  bioBody: string;
  stats: [{ value: string; label: string }, { value: string; label: string }, { value: string; label: string }];
};

export type HeroContentRow = {
  id: string;
  term_tag: string;
  headline_top: string;
  rotating_words: string[];
  bio_name: string;
  bio_body: string;
  stat_1_value: string;
  stat_1_label: string;
  stat_2_value: string;
  stat_2_label: string;
  stat_3_value: string;
  stat_3_label: string;
  updated_at: string;
  updated_by: string | null;
};

export function mergeHeroContent(row: HeroContentRow | null | undefined): HeroContent {
  if (!row) {
    return {
      termTag: DEFAULT_HERO_CONTENT.termTag,
      headlineTop: DEFAULT_HERO_CONTENT.headlineTop,
      rotatingWords: [...DEFAULT_HERO_CONTENT.rotatingWords],
      bioName: DEFAULT_HERO_CONTENT.bioName,
      bioBody: DEFAULT_HERO_CONTENT.bioBody,
      stats: DEFAULT_HERO_CONTENT.stats.map((stat) => ({ ...stat })) as HeroContent["stats"],
    };
  }

  const words =
    row.rotating_words?.filter((w) => w.trim().length > 0) ?? [];
  const rotatingWords =
    words.length > 0 ? words : [...DEFAULT_HERO_CONTENT.rotatingWords];

  return {
    termTag: row.term_tag?.trim() || DEFAULT_HERO_CONTENT.termTag,
    headlineTop: row.headline_top?.trim() || DEFAULT_HERO_CONTENT.headlineTop,
    rotatingWords,
    bioName: row.bio_name?.trim() || DEFAULT_HERO_CONTENT.bioName,
    bioBody: row.bio_body?.trim() || DEFAULT_HERO_CONTENT.bioBody,
    stats: [
      {
        value: row.stat_1_value?.trim() || DEFAULT_HERO_CONTENT.stats[0].value,
        label: row.stat_1_label?.trim() || DEFAULT_HERO_CONTENT.stats[0].label,
      },
      {
        value: row.stat_2_value?.trim() || DEFAULT_HERO_CONTENT.stats[1].value,
        label: row.stat_2_label?.trim() || DEFAULT_HERO_CONTENT.stats[1].label,
      },
      {
        value: row.stat_3_value?.trim() || DEFAULT_HERO_CONTENT.stats[2].value,
        label: row.stat_3_label?.trim() || DEFAULT_HERO_CONTENT.stats[2].label,
      },
    ],
  };
}

export function parseRotatingWordsInput(input: string): string[] {
  return input
    .split(",")
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean);
}

export function formatRotatingWordsInput(words: string[]): string {
  return words.join(", ");
}
