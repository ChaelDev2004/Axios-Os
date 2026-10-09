"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryPicker } from "@/components/finance/category-picker";
import { formatPhp } from "@/features/dashboard/lib/format";
import { firstCategoryFor, isCategoryAllowed } from "@/features/finance/lib/categories";
import { todayIso, type ParsedReceipt } from "@/features/finance/lib/receipt-parser";
import {
  receiptScanSchema,
  type ReceiptScanFormInput,
  type ReceiptScanFormValues,
} from "@/features/finance/schemas/receipt-scan.schema";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type TransactionType,
} from "@/features/auth/types/database.types";

interface ScanResultFormProps {
  previewUrl: string | null;
  parsed: ParsedReceipt | null;
  warnings: string[];
  isOnline: boolean;
  isSaving: boolean;
  onBack: () => void;
  onRetake: () => void;
  onSubmit: (values: ReceiptScanFormValues, shouldAttachImage: boolean) => void;
}

type FieldErrors = Partial<Record<keyof ReceiptScanFormInput, string>>;

const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][];

const INPUT_CLASS = "mt-2! h-11 rounded-xl border-white/10 bg-white/5 px-4!";
const FIELD_LABEL_CLASS = "text-xs font-medium text-muted-foreground";
const FIELD_ERROR_CLASS = "mt-1.5! text-xs text-rose-300";
const CHIP_CLASS =
  "min-h-10 rounded-full border px-4! text-sm transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none";
const CHIP_IDLE_CLASS = "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10";
const CHIP_ACTIVE_CLASS = "border-indigo-400/50 bg-indigo-500/20 text-white";

function defaultNotes(category: string, merchant: string | null): string {
  return merchant ? `${category} from ${merchant}` : "";
}

function initialValues(parsed: ParsedReceipt | null): ReceiptScanFormInput {
  const type = parsed?.type ?? "expense";
  const category = parsed?.category ?? firstCategoryFor(type);
  return {
    amount: parsed?.amount ? parsed.amount.toFixed(2) : "",
    type,
    category,
    merchant: parsed?.merchant ?? "",
    date: parsed?.date ?? todayIso(),
    paymentMethod: "cash",
    notes: defaultNotes(category, parsed?.merchant ?? null),
  };
}

function confidenceTone(confidence: number) {
  if (confidence >= 80) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  if (confidence >= 60) return "border-sky-400/30 bg-sky-500/10 text-sky-300";
  return "border-amber-400/30 bg-amber-500/10 text-amber-300";
}

export function ScanResultForm({
  previewUrl,
  parsed,
  warnings,
  isOnline,
  isSaving,
  onBack,
  onRetake,
  onSubmit,
}: ScanResultFormProps) {
  const [values, setValues] = useState<ReceiptScanFormInput>(() => initialValues(parsed));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [shouldAttachImage, setShouldAttachImage] = useState(true);
  const [isItemsOpen, setIsItemsOpen] = useState(false);

  const isScanned = parsed !== null;
  const canAttach = Boolean(previewUrl) && isOnline;
  const amountChoices = parsed?.amount
    ? [parsed.amount, ...parsed.alternatives.filter((v) => v !== parsed.amount)]
    : [];

  function update<K extends keyof ReceiptScanFormInput>(key: K, value: ReceiptScanFormInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function changeType(type: TransactionType) {
    setValues((prev) => {
      const category = isCategoryAllowed(prev.category, type) ? prev.category : firstCategoryFor(type);
      const hasDefaultNotes = prev.notes === defaultNotes(prev.category, prev.merchant || null);
      return {
        ...prev,
        type,
        category,
        notes: hasDefaultNotes ? defaultNotes(category, prev.merchant || null) : prev.notes,
      };
    });
  }

  function changeCategory(category: string) {
    setValues((prev) => {
      const hasDefaultNotes = prev.notes === defaultNotes(prev.category, prev.merchant || null);
      return {
        ...prev,
        category,
        notes: hasDefaultNotes ? defaultNotes(category, prev.merchant || null) : prev.notes,
      };
    });
    setErrors((prev) => ({ ...prev, category: undefined }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const result = receiptScanSchema.safeParse(values);
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ReceiptScanFormInput;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    onSubmit(result.data, canAttach && shouldAttachImage);
  }

  return (
    <form onSubmit={submit} className="flex h-full flex-col" noValidate>
      <header
        className="flex items-center gap-3 border-b border-white/10 px-4! pb-3!"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Close scanner"
          className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <div className="axion-kicker">{isScanned ? "Scan result" : "Manual entry"}</div>
          <h2 className="mt-0.5! truncate text-lg font-semibold">Review transaction</h2>
        </div>
        {isScanned ? (
          <span
            className={`ml-auto! shrink-0 rounded-full border px-3! py-1! text-xs font-medium ${confidenceTone(parsed.confidence)}`}
            title="OCR confidence"
          >
            {parsed.confidence}% confidence
          </span>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4! py-5! sm:px-6!">
        <div className="mx-auto! flex w-full max-w-xl flex-col gap-6">
          {previewUrl ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2!">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="mx-auto! block max-h-56 w-auto rounded-xl object-contain"
              />
            </div>
          ) : null}

          {warnings.length ? (
            <ul className="flex flex-col gap-2" aria-label="Scan warnings">
              {warnings.map((w) => (
                <li
                  key={w}
                  className="flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3.5! py-2.5! text-sm leading-snug text-amber-200"
                >
                  <AlertTriangle className="mt-0.5! size-4 shrink-0" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          ) : null}

          <section>
            <Label htmlFor="scan-amount" className={FIELD_LABEL_CLASS}>
              Amount (₱)
            </Label>
            <Input
              id="scan-amount"
              inputMode="decimal"
              autoComplete="off"
              value={values.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="0.00"
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "scan-amount-error" : undefined}
              className={`${INPUT_CLASS} h-14 text-2xl font-semibold tabular-nums`}
            />
            {errors.amount ? (
              <p id="scan-amount-error" className={FIELD_ERROR_CLASS}>
                {errors.amount}
              </p>
            ) : null}
            {amountChoices.length > 1 ? (
              <div className="mt-3!">
                <p className={FIELD_LABEL_CLASS}>Possible amounts</p>
                <div className="mt-2! flex flex-wrap gap-2" role="group" aria-label="Possible amounts">
                  {amountChoices.map((choice) => {
                    const isSelected = Number(values.amount) === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => update("amount", choice.toFixed(2))}
                        className={`${CHIP_CLASS} tabular-nums ${isSelected ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS}`}
                      >
                        {formatPhp(choice)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <section>
            <p className={FIELD_LABEL_CLASS} id="scan-type-label">
              Transaction type
            </p>
            <div className="mt-2! grid grid-cols-2 gap-2" role="group" aria-labelledby="scan-type-label">
              {(["expense", "income"] as const).map((t) => {
                const isActive = values.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => changeType(t)}
                    className={`min-h-11 rounded-full border px-4! text-sm font-medium capitalize transition-colors focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none ${
                      isActive
                        ? t === "income"
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                          : "border-rose-400/40 bg-rose-500/15 text-rose-300"
                        : CHIP_IDLE_CLASS
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className={FIELD_LABEL_CLASS}>Category</p>
            <CategoryPicker type={values.type} value={values.category} onChange={changeCategory} />
            {errors.category ? <p className={FIELD_ERROR_CLASS}>{errors.category}</p> : null}
          </section>

          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
            <div>
              <Label htmlFor="scan-merchant" className={FIELD_LABEL_CLASS}>
                Merchant
              </Label>
              <Input
                id="scan-merchant"
                value={values.merchant}
                maxLength={120}
                onChange={(e) => update("merchant", e.target.value)}
                placeholder="Store or payer name"
                aria-invalid={Boolean(errors.merchant)}
                className={INPUT_CLASS}
              />
              {errors.merchant ? <p className={FIELD_ERROR_CLASS}>{errors.merchant}</p> : null}
            </div>
            <div>
              <Label htmlFor="scan-date" className={FIELD_LABEL_CLASS}>
                Date
              </Label>
              <Input
                id="scan-date"
                type="date"
                value={values.date}
                onChange={(e) => update("date", e.target.value)}
                aria-invalid={Boolean(errors.date)}
                className={INPUT_CLASS}
              />
              {errors.date ? <p className={FIELD_ERROR_CLASS}>{errors.date}</p> : null}
            </div>
          </section>

          <section>
            <p className={FIELD_LABEL_CLASS} id="scan-payment-label">
              Payment method
            </p>
            <div className="mt-2! flex flex-wrap gap-2" role="group" aria-labelledby="scan-payment-label">
              {PAYMENT_METHODS.map(([id, label]) => {
                const isActive = values.paymentMethod === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => update("paymentMethod", id)}
                    className={`${CHIP_CLASS} ${isActive ? CHIP_ACTIVE_CLASS : CHIP_IDLE_CLASS}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <Label htmlFor="scan-notes" className={FIELD_LABEL_CLASS}>
              Notes
            </Label>
            <Input
              id="scan-notes"
              value={values.notes}
              maxLength={500}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Optional note"
              aria-invalid={Boolean(errors.notes)}
              className={INPUT_CLASS}
            />
            {errors.notes ? <p className={FIELD_ERROR_CLASS}>{errors.notes}</p> : null}
          </section>

          {parsed?.items.length ? (
            <section className="rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                type="button"
                aria-expanded={isItemsOpen}
                onClick={() => setIsItemsOpen((v) => !v)}
                className="flex min-h-12 w-full items-center justify-between rounded-xl px-4! text-sm font-medium focus-visible:ring-2 focus-visible:ring-indigo-400/70 focus-visible:outline-none"
              >
                Detected items ({parsed.items.length})
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${isItemsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {isItemsOpen ? (
                <ul className="flex flex-col gap-2 border-t border-white/10 px-4! py-3! text-sm text-muted-foreground">
                  {parsed.items.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="flex justify-between gap-3">
                      <span className="truncate">{item.name}</span>
                      <span className="shrink-0 tabular-nums">{formatPhp(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {previewUrl ? (
            <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4! py-3! text-sm">
              <span>
                Attach receipt image
                {!isOnline ? (
                  <span className="mt-1! block text-xs text-muted-foreground">
                    Unavailable offline. The transaction will still be saved.
                  </span>
                ) : null}
              </span>
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-indigo-500"
                checked={canAttach && shouldAttachImage}
                disabled={!canAttach}
                onChange={(e) => setShouldAttachImage(e.target.checked)}
              />
            </label>
          ) : null}
        </div>
      </div>

      <footer
        className="border-t border-white/10 px-4! pt-3! sm:px-6!"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto! flex w-full max-w-xl gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1 rounded-full px-4!"
            onClick={onRetake}
            disabled={isSaving}
          >
            <Camera /> {previewUrl ? "Retake" : "Scan instead"}
          </Button>
          <Button
            type="submit"
            className="h-12 flex-[1.4] rounded-full px-4! text-white"
            style={{ background: "linear-gradient(to right, #6366f1, #d946ef)" }}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
            {isSaving ? "Saving..." : "Confirm Transaction"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
