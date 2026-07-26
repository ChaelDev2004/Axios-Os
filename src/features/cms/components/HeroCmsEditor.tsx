"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  heroContentToInput,
  type HeroContentInput,
} from "@/features/cms/services/hero-content.service";
import {
  useHeroContent,
  useUpsertHeroContent,
} from "@/features/cms/hooks/use-hero-content";
import { DEFAULT_HERO_CONTENT } from "@/lib/hero-content-defaults";

function emptyForm(): HeroContentInput {
  return {
    termTag: DEFAULT_HERO_CONTENT.termTag,
    headlineTop: DEFAULT_HERO_CONTENT.headlineTop,
    rotatingWordsInput: DEFAULT_HERO_CONTENT.rotatingWords.join(", "),
    bioName: DEFAULT_HERO_CONTENT.bioName,
    bioBody: DEFAULT_HERO_CONTENT.bioBody,
    stat1Value: DEFAULT_HERO_CONTENT.stats[0].value,
    stat1Label: DEFAULT_HERO_CONTENT.stats[0].label,
    stat2Value: DEFAULT_HERO_CONTENT.stats[1].value,
    stat2Label: DEFAULT_HERO_CONTENT.stats[1].label,
    stat3Value: DEFAULT_HERO_CONTENT.stats[2].value,
    stat3Label: DEFAULT_HERO_CONTENT.stats[2].label,
  };
}

export function HeroCmsEditor() {
  const { data, isLoading } = useHeroContent();
  const save = useUpsertHeroContent({
    onSuccess: () => toast.success("Hero section updated"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<HeroContentInput>(emptyForm);

  useEffect(() => {
    if (data) {
      setForm(heroContentToInput(data));
    }
  }, [data]);

  const set =
    (key: keyof HeroContentInput) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  const onResetDefaults = () => {
    setForm(emptyForm());
  };

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">Site CMS</div>
      <h2 className="axion-title">Hero section</h2>
      <p className="axion-body">
        Edit homepage hero text only. Images and layout stay unchanged. Empty fields fall back to defaults.
      </p>

      {isLoading ? (
        <p className="axion-meta mt-4">Loading hero content…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hero-term-tag">Tag line</Label>
              <Input
                id="hero-term-tag"
                value={form.termTag}
                onChange={(e) => set("termTag")(e.target.value)}
                placeholder={DEFAULT_HERO_CONTENT.termTag}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-headline-top">Headline (top)</Label>
              <Input
                id="hero-headline-top"
                value={form.headlineTop}
                onChange={(e) => set("headlineTop")(e.target.value)}
                placeholder={DEFAULT_HERO_CONTENT.headlineTop}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hero-rotating-words">Rotating words</Label>
            <Input
              id="hero-rotating-words"
              value={form.rotatingWordsInput}
              onChange={(e) => set("rotatingWordsInput")(e.target.value)}
              placeholder={DEFAULT_HERO_CONTENT.rotatingWords.join(", ")}
            />
            <p className="text-xs text-slate-500">Comma-separated, e.g. INTENT, PURPOSE, IMPACT</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hero-bio-name">Bio name</Label>
              <Input
                id="hero-bio-name"
                value={form.bioName}
                onChange={(e) => set("bioName")(e.target.value)}
                placeholder={DEFAULT_HERO_CONTENT.bioName}
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="hero-bio-body">Bio description</Label>
              <Input
                id="hero-bio-body"
                value={form.bioBody}
                onChange={(e) => set("bioBody")(e.target.value)}
                placeholder={DEFAULT_HERO_CONTENT.bioBody}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Stats</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[1, 2, 3].map((n) => {
                const valueKey = `stat${n}Value` as keyof HeroContentInput;
                const labelKey = `stat${n}Label` as keyof HeroContentInput;
                const defaultStat = DEFAULT_HERO_CONTENT.stats[n - 1];

                return (
                  <div key={n} className="axion-soft space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Stat {n}
                    </p>
                    <Input
                      value={form[valueKey]}
                      onChange={(e) => set(valueKey)(e.target.value)}
                      placeholder={defaultStat.value}
                      aria-label={`Stat ${n} value`}
                    />
                    <Input
                      value={form[labelKey]}
                      onChange={(e) => set(labelKey)(e.target.value)}
                      placeholder={defaultStat.label}
                      aria-label={`Stat ${n} label`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save hero content"}
            </Button>
            <Button type="button" variant="outline" onClick={onResetDefaults}>
              Reset form to defaults
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
