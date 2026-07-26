export type AboutFeature = {
  num: string;
  title: string;
  desc: string;
};

export const DEFAULT_ABOUT_CONTENT = {
  leadText:
    "I'm Chael — a Full Stack Developer who bridges robust engineering with thoughtful design. Drag the card to explore, then scroll to see what I build with.",
  hireButtonLabel: "Hire Me",
  cvButtonLabel: "CV",
  cvUrl: "",
  cvFileName: "",
  cvRedirectUrl: "",
  lanyardHint: "Drag It!",
  features: [
    {
      num: "01",
      title: "Clean Architecture",
      desc: "Scalable, maintainable systems built with modern patterns — from database schema to API design.",
    },
    {
      num: "02",
      title: "Performance First",
      desc: "Every interaction optimized for speed — lazy loading, caching, and lean bundles by default.",
    },
    {
      num: "03",
      title: "Secure by Design",
      desc: "Authentication, validation, and data handling built with security as a first-class concern.",
    },
    {
      num: "04",
      title: "Pixel-Perfect UI",
      desc: "Interfaces crafted with motion and detail — every hover, transition, and layout intentional.",
    },
  ],
} as const;

export type AboutContent = {
  leadText: string;
  hireButtonLabel: string;
  cvButtonLabel: string;
  cvUrl: string;
  cvFileName: string;
  cvRedirectUrl: string;
  lanyardHint: string;
  features: [AboutFeature, AboutFeature, AboutFeature, AboutFeature];
};

export type AboutContentRow = {
  id: string;
  lead_text: string;
  hire_button_label: string;
  cv_button_label: string;
  cv_url?: string | null;
  cv_file_name?: string | null;
  cv_redirect_url?: string | null;
  lanyard_hint: string;
  feature_1_num: string;
  feature_1_title: string;
  feature_1_desc: string;
  feature_2_num: string;
  feature_2_title: string;
  feature_2_desc: string;
  feature_3_num: string;
  feature_3_title: string;
  feature_3_desc: string;
  feature_4_num: string;
  feature_4_title: string;
  feature_4_desc: string;
  updated_at: string;
  updated_by: string | null;
};

function defaultFeatures(): AboutContent["features"] {
  return DEFAULT_ABOUT_CONTENT.features.map((feature) => ({
    ...feature,
  })) as AboutContent["features"];
}

function featureFromRow(
  row: AboutContentRow,
  index: 1 | 2 | 3 | 4,
  fallback: AboutFeature
): AboutFeature {
  const num = row[`feature_${index}_num` as keyof AboutContentRow] as string;
  const title = row[`feature_${index}_title` as keyof AboutContentRow] as string;
  const desc = row[`feature_${index}_desc` as keyof AboutContentRow] as string;

  return {
    num: num?.trim() || fallback.num,
    title: title?.trim() || fallback.title,
    desc: desc?.trim() || fallback.desc,
  };
}

export function resolveAboutCvHref(content: AboutContent): string | null {
  const redirect = content.cvRedirectUrl?.trim();
  if (redirect) return redirect;
  const file = content.cvUrl?.trim();
  if (file) return file;
  return null;
}

export function mergeAboutContent(
  row: AboutContentRow | null | undefined
): AboutContent {
  if (!row) {
    return {
      leadText: DEFAULT_ABOUT_CONTENT.leadText,
      hireButtonLabel: DEFAULT_ABOUT_CONTENT.hireButtonLabel,
      cvButtonLabel: DEFAULT_ABOUT_CONTENT.cvButtonLabel,
      cvUrl: DEFAULT_ABOUT_CONTENT.cvUrl,
      cvFileName: DEFAULT_ABOUT_CONTENT.cvFileName,
      cvRedirectUrl: DEFAULT_ABOUT_CONTENT.cvRedirectUrl,
      lanyardHint: DEFAULT_ABOUT_CONTENT.lanyardHint,
      features: defaultFeatures(),
    };
  }

  return {
    leadText: row.lead_text?.trim() || DEFAULT_ABOUT_CONTENT.leadText,
    hireButtonLabel:
      row.hire_button_label?.trim() || DEFAULT_ABOUT_CONTENT.hireButtonLabel,
    cvButtonLabel:
      row.cv_button_label?.trim() || DEFAULT_ABOUT_CONTENT.cvButtonLabel,
    cvUrl: row.cv_url?.trim() || "",
    cvFileName: row.cv_file_name?.trim() || "",
    cvRedirectUrl: row.cv_redirect_url?.trim() || "",
    lanyardHint: row.lanyard_hint?.trim() || DEFAULT_ABOUT_CONTENT.lanyardHint,
    features: [
      featureFromRow(row, 1, DEFAULT_ABOUT_CONTENT.features[0]),
      featureFromRow(row, 2, DEFAULT_ABOUT_CONTENT.features[1]),
      featureFromRow(row, 3, DEFAULT_ABOUT_CONTENT.features[2]),
      featureFromRow(row, 4, DEFAULT_ABOUT_CONTENT.features[3]),
    ],
  };
}
