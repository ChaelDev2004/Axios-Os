const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as Philippine Peso (e.g. ₱1,234.56). */
export function formatPhp(amount: number): string {
  return phpFormatter.format(Number.isFinite(amount) ? amount : 0);
}

/** Format seconds as hours with one decimal (e.g. "2.5h"). */
export function formatHours(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const hours = safe / 3600;
  return `${hours.toFixed(1)}h`;
}
