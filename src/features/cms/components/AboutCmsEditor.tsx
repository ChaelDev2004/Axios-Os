"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  aboutContentToInput,
  type AboutContentInput,
} from "@/features/cms/services/about-content.service";
import {
  removeAboutCvFile,
  uploadAboutCvFile,
} from "@/features/cms/services/about-cv-upload.service";
import {
  useAboutContent,
  useUpsertAboutContent,
} from "@/features/cms/hooks/use-about-content";
import { DEFAULT_ABOUT_CONTENT } from "@/lib/about-content-defaults";
import { cn } from "@/lib/utils";

function emptyForm(): AboutContentInput {
  const [f1, f2, f3, f4] = DEFAULT_ABOUT_CONTENT.features;

  return {
    leadText: DEFAULT_ABOUT_CONTENT.leadText,
    hireButtonLabel: DEFAULT_ABOUT_CONTENT.hireButtonLabel,
    cvButtonLabel: DEFAULT_ABOUT_CONTENT.cvButtonLabel,
    cvUrl: DEFAULT_ABOUT_CONTENT.cvUrl,
    cvFileName: DEFAULT_ABOUT_CONTENT.cvFileName,
    cvRedirectUrl: DEFAULT_ABOUT_CONTENT.cvRedirectUrl,
    lanyardHint: DEFAULT_ABOUT_CONTENT.lanyardHint,
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

const textareaClass = cn(
  "flex min-h-[88px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
);

function isPdf(url: string, fileName: string) {
  const lower = `${url} ${fileName}`.toLowerCase();
  return lower.includes(".pdf") || lower.includes("application/pdf");
}

function isImage(url: string, fileName: string) {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(`${url} ${fileName}`);
}

export function AboutCmsEditor() {
  const { data, isLoading } = useAboutContent();
  const save = useUpsertAboutContent({
    onSuccess: () => toast.success("About section updated"),
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<AboutContentInput>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setForm(aboutContentToInput(data));
    }
  }, [data]);

  const set =
    (key: keyof AboutContentInput) =>
    (value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const applyCvFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadAboutCvFile(file);
      setForm((prev) => ({
        ...prev,
        cvUrl: uploaded.url,
        cvFileName: uploaded.fileName,
      }));
      toast.success("CV uploaded — save About to publish");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const onPickFile = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void applyCvFile(file);
  };

  const clearCvFile = async () => {
    const prevUrl = form.cvUrl;
    setForm((prev) => ({ ...prev, cvUrl: "", cvFileName: "" }));
    if (prevUrl) {
      try {
        await removeAboutCvFile(prevUrl);
      } catch {
        /* ignore storage cleanup errors */
      }
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate(form);
  };

  const viewerUrl = form.cvUrl.trim();
  const showPdf = viewerUrl && isPdf(viewerUrl, form.cvFileName);
  const showImage = viewerUrl && isImage(viewerUrl, form.cvFileName);

  return (
    <div className="axion-card mt-6">
      <div className="axion-kicker">Site CMS</div>
      <h2 className="axion-title">About section</h2>
      <p className="axion-body">
        Edit homepage about text, CV file, and optional redirect link.
      </p>

      {isLoading ? (
        <p className="axion-meta mt-4">Loading about content…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="about-lead">Lead paragraph</Label>
            <textarea
              id="about-lead"
              className={textareaClass}
              value={form.leadText}
              onChange={(e) => set("leadText")(e.target.value)}
              placeholder={DEFAULT_ABOUT_CONTENT.leadText}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="about-hire-btn">Hire button</Label>
              <Input
                id="about-hire-btn"
                value={form.hireButtonLabel}
                onChange={(e) => set("hireButtonLabel")(e.target.value)}
                placeholder={DEFAULT_ABOUT_CONTENT.hireButtonLabel}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about-cv-btn">CV button</Label>
              <Input
                id="about-cv-btn"
                value={form.cvButtonLabel}
                onChange={(e) => set("cvButtonLabel")(e.target.value)}
                placeholder={DEFAULT_ABOUT_CONTENT.cvButtonLabel}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about-lanyard-hint">Card hint</Label>
              <Input
                id="about-lanyard-hint"
                value={form.lanyardHint}
                onChange={(e) => set("lanyardHint")(e.target.value)}
                placeholder={DEFAULT_ABOUT_CONTENT.lanyardHint}
              />
            </div>
          </div>

          <div className="axion-soft space-y-4">
            <div>
              <Label htmlFor="about-cv-redirect">CV redirect link</Label>
              <p className="axion-meta mt-1 mb-2">
                Optional. If set, the CV button opens this URL first (Drive,
                Notion, portfolio, etc.).
              </p>
              <Input
                id="about-cv-redirect"
                type="url"
                value={form.cvRedirectUrl}
                onChange={(e) => set("cvRedirectUrl")(e.target.value)}
                placeholder="https://…"
              />
            </div>

            <div>
              <Label>CV file</Label>
              <p className="axion-meta mt-1 mb-2">
                Drag & drop or upload a PDF / Word / image (max 10MB).
              </p>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                onChange={(e) => {
                  onPickFile(e.target.files);
                  e.target.value = "";
                }}
              />

              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition",
                  dragging
                    ? "border-indigo-400 bg-indigo-500/10"
                    : "border-white/15 bg-white/[0.03] hover:border-white/30",
                  uploading && "pointer-events-none opacity-60"
                )}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  onPickFile(e.dataTransfer.files);
                }}
              >
                <Upload className="h-5 w-5 text-indigo-300" />
                <p className="text-sm font-medium text-slate-200">
                  {uploading ? "Uploading…" : "Drop CV here or click to upload"}
                </p>
                <p className="text-xs text-slate-500">PDF, DOC, DOCX, PNG, JPG</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Choose file
                </Button>
                {form.cvUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void clearCvFile()}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove file
                  </Button>
                ) : null}
              </div>
            </div>

            {form.cvUrl || form.cvRedirectUrl ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-sm text-slate-300">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-300" />
                    <span className="truncate">
                      {form.cvFileName || "CV file"}
                      {form.cvRedirectUrl ? " · redirect set" : ""}
                    </span>
                  </div>
                  <a
                    href={form.cvRedirectUrl.trim() || form.cvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {viewerUrl ? (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-500">
                      File viewer
                    </div>
                    {showPdf ? (
                      <iframe
                        title="CV preview"
                        src={viewerUrl}
                        className="h-[420px] w-full bg-zinc-950"
                      />
                    ) : showImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={viewerUrl}
                        alt={form.cvFileName || "CV"}
                        className="max-h-[420px] w-full object-contain bg-zinc-950 p-4"
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-400">
                        <p>Preview not available for this file type.</p>
                        <a
                          href={viewerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-300 hover:underline"
                        >
                          Open uploaded file
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Redirect-only mode — upload a file to enable the in-app
                    viewer.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <Label>Feature blocks</Label>
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((n) => {
                const numKey = `feature${n}Num` as keyof AboutContentInput;
                const titleKey = `feature${n}Title` as keyof AboutContentInput;
                const descKey = `feature${n}Desc` as keyof AboutContentInput;
                const fallback = DEFAULT_ABOUT_CONTENT.features[n - 1];

                return (
                  <div key={n} className="axion-soft space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Feature {n}
                    </p>
                    <div className="grid grid-cols-[72px_1fr] gap-2">
                      <Input
                        value={form[numKey]}
                        onChange={(e) => set(numKey)(e.target.value)}
                        placeholder={fallback.num}
                        aria-label={`Feature ${n} number`}
                      />
                      <Input
                        value={form[titleKey]}
                        onChange={(e) => set(titleKey)(e.target.value)}
                        placeholder={fallback.title}
                        aria-label={`Feature ${n} title`}
                      />
                    </div>
                    <textarea
                      className={textareaClass}
                      value={form[descKey]}
                      onChange={(e) => set(descKey)(e.target.value)}
                      placeholder={fallback.desc}
                      rows={3}
                      aria-label={`Feature ${n} description`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" disabled={save.isPending || uploading}>
              {save.isPending ? "Saving…" : "Save about content"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm(emptyForm())}
            >
              Reset form to defaults
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
