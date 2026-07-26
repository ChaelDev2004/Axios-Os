"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useContactContent,
  useUpsertContactContent,
} from "@/features/cms/hooks/use-contact-content";
import {
  contactContentToInput,
  newEmptySocialItem,
  type ContactContentInput,
} from "@/features/cms/services/contact-content.service";
import { DEFAULT_CONTACT_CONTENT } from "@/lib/contact-content-defaults";
import { cn } from "@/lib/utils";

const textareaClass = cn(
  "flex min-h-[88px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
);

function emptyForm(): ContactContentInput {
  return {
    subTitle: DEFAULT_CONTACT_CONTENT.subTitle,
    title: DEFAULT_CONTACT_CONTENT.title,
    intro: DEFAULT_CONTACT_CONTENT.intro,
    email: DEFAULT_CONTACT_CONTENT.email,
    phone: DEFAULT_CONTACT_CONTENT.phone,
    socials: DEFAULT_CONTACT_CONTENT.socials.map((social) => ({ ...social })),
    marqueeItemsInput: DEFAULT_CONTACT_CONTENT.marqueeItems.join("\n"),
  };
}

function updateSocial(
  prev: ContactContentInput,
  index: number,
  patch: Partial<ContactContentInput["socials"][number]>
): ContactContentInput {
  return {
    ...prev,
    socials: prev.socials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
  };
}

export function ContactCmsEditor() {
  const { data, isLoading } = useContactContent();
  const save = useUpsertContactContent({
    onSuccess: () => toast.success("Contact section updated"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<ContactContentInput>(emptyForm);

  useEffect(() => {
    if (data) {
      setForm(contactContentToInput(data));
    }
  }, [data]);

  const addSocial = () => {
    setForm((prev) => ({
      ...prev,
      socials: [...prev.socials, newEmptySocialItem()],
    }));
  };

  const removeSocial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">Site CMS</div>
      <h2 className="axion-title">Contact section</h2>
      <p className="axion-body">
        Edit contact details and social links. Visitors can click GitHub, LinkedIn, and other links you add here.
      </p>

      {isLoading ? (
        <p className="axion-meta mt-4">Loading contact content…</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="mt-6 space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-subtitle">Subtitle</Label>
              <Input
                id="contact-subtitle"
                value={form.subTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subTitle: e.target.value }))}
                placeholder={DEFAULT_CONTACT_CONTENT.subTitle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-title">Title</Label>
              <Input
                id="contact-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={DEFAULT_CONTACT_CONTENT.title}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-intro">Intro text</Label>
            <textarea
              id="contact-intro"
              className={textareaClass}
              value={form.intro}
              onChange={(e) => setForm((prev) => ({ ...prev, intro: e.target.value }))}
              placeholder={DEFAULT_CONTACT_CONTENT.intro}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder={DEFAULT_CONTACT_CONTENT.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder={DEFAULT_CONTACT_CONTENT.phone}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Social links ({form.socials.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSocial}>
                + Add link
              </Button>
            </div>

            <div className="grid gap-4">
              {form.socials.map((social, index) => (
                <div key={`${social.name}-${index}`} className="axion-soft space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Link {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-400 hover:text-red-300"
                      onClick={() => removeSocial(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={social.name}
                      onChange={(e) => setForm((prev) => updateSocial(prev, index, { name: e.target.value }))}
                      placeholder="GitHub"
                      aria-label={`Social link ${index + 1} name`}
                    />
                    <Input
                      value={social.href}
                      onChange={(e) => setForm((prev) => updateSocial(prev, index, { href: e.target.value }))}
                      placeholder="https://github.com/your-username"
                      aria-label={`Social link ${index + 1} URL`}
                    />
                  </div>
                </div>
              ))}

              {form.socials.length === 0 && (
                <p className="axion-meta py-4 text-center">
                  No social links yet. Click &ldquo;+ Add link&rdquo; to add GitHub, LinkedIn, and more.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-marquee">Marquee items</Label>
            <textarea
              id="contact-marquee"
              className={textareaClass}
              value={form.marqueeItemsInput}
              onChange={(e) => setForm((prev) => ({ ...prev, marqueeItemsInput: e.target.value }))}
              placeholder={DEFAULT_CONTACT_CONTENT.marqueeItems.join("\n")}
              rows={5}
            />
            <p className="text-xs text-slate-500">One item per line.</p>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save contact content"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(emptyForm())}>
              Reset to defaults
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
