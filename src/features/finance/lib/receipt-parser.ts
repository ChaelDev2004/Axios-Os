import type { TransactionType } from "@/features/auth/types/database.types";
import { isCategoryAllowed } from "@/features/finance/lib/categories";

export interface AmountCandidate {
  value: number;
  score: number;
  line: string;
}

export interface ReceiptItem {
  name: string;
  amount: number;
}

export interface ParsedReceipt {
  amount: number | null;
  alternatives: number[];
  candidates: AmountCandidate[];
  merchant: string | null;
  date: string;
  isDateDetected: boolean;
  currency: string;
  items: ReceiptItem[];
  type: TransactionType;
  category: string;
  confidence: number;
}

interface MerchantRule {
  pattern: RegExp;
  name: string;
  category: string;
}

interface KeywordRule {
  pattern: RegExp;
  score: number;
}

const MAX_AMOUNT = 10_000_000;
const ALTERNATIVE_SCORE_GAP = 15;
const MAX_ITEMS = 15;

const AMOUNT_PATTERN = /(?:₱|PHP|P(?=\s?\d))?\s?(\d{1,3}(?:,\d{3})+|\d+)[.,](\d{2})(?![\d%])/gi;
const DATE_TOKEN = /\b\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}\b/g;
const TIME_TOKEN = /\b\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM)?\b/gi;
const PHONE_TOKEN = /(?:\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}|\(\d{2,3}\)\s?\d{3,4}[\s-]?\d{4}/g;
const IDENTIFIER_LINE =
  /\b(TIN|MIN|S\/?N|PTU|ACCR|SERIAL|REF(?:ERENCE)?|OR\s?(?:NO|#)|SI\s?(?:NO|#)|INVOICE\s?(?:NO|#)|TRANS(?:ACTION)?\s?(?:NO|#|ID)|TXN|CARD\s?(?:NO|#)|APPROVAL|AUTH\s?CODE|TEL|PHONE|MOBILE|FAX)\b/i;

const POSITIVE_KEYWORDS: KeywordRule[] = [
  { pattern: /GRAND\s*T[O0]TAL|AM(?:OUN)?T\s*DUE|T[O0]TAL\s*DUE|BALANCE\s*DUE|T[O0]TAL\s*AM(?:OUN)?T|AMOUNT\s*PAYABLE|T[O0]TAL\s*PAYABLE|NET\s*PAY|TAKE\s*HOME\s*PAY|AMOUNT\s*RECEIVED|AMOUNT\s*PAID|DEPOSIT\s*AMOUNT/i, score: 60 },
  { pattern: /NET\s*T[O0]TAL|\bT[O0]TAL\b/i, score: 50 },
  { pattern: /\bPAYMENT\b|\bAM(?:OUN)?T\b/i, score: 25 },
];

const NEGATIVE_KEYWORDS: KeywordRule[] = [
  { pattern: /SUB\s*-?\s*T[O0]TAL/i, score: -80 },
  { pattern: /T[O0]TAL\s*(?:ITEMS?|QTY|QUANTITY|PCS|COUNT)|\bQTY\b|ITEMS?\s*SOLD/i, score: -60 },
  { pattern: /\bVAT|\bTAX|VATABLE|ZERO[\s-]?RATED|EXEMPT/i, score: -60 },
  { pattern: /DISC(?:OUNT)?\b|\bLESS\b|SENIOR|\bPWD\b|PROMO|VOUCHER|DEDUCTIONS?|WITHHOLDING/i, score: -45 },
  { pattern: /\bCHANGE\b/i, score: -70 },
  { pattern: /\bCASH\b|TENDER(?:ED)?|GROSS|BASIC\s*(?:PAY|SALARY)/i, score: -20 },
];

const MERCHANTS: MerchantRule[] = [
  { pattern: /JOLLIBEE/i, name: "Jollibee", category: "Food" },
  { pattern: /MC\s?DONALD|MCDO\b/i, name: "McDonald's", category: "Food" },
  { pattern: /\bKFC\b/i, name: "KFC", category: "Food" },
  { pattern: /CHOWKING/i, name: "Chowking", category: "Food" },
  { pattern: /MANG\s?INASAL/i, name: "Mang Inasal", category: "Food" },
  { pattern: /GREENWICH/i, name: "Greenwich", category: "Food" },
  { pattern: /SM\s?(?:SUPER\s?MARKET|HYPERMARKET|SAVEMORE)/i, name: "SM Supermarket", category: "Food" },
  { pattern: /PUREGOLD/i, name: "Puregold", category: "Food" },
  { pattern: /ROBINSONS\s?(?:SUPERMARKET|EASYMART)/i, name: "Robinsons Supermarket", category: "Food" },
  { pattern: /7[\s-]?ELEVEN/i, name: "7-Eleven", category: "Food" },
  { pattern: /MINISTOP/i, name: "Ministop", category: "Food" },
  { pattern: /FAMILY\s?MART/i, name: "FamilyMart", category: "Food" },
  { pattern: /LANDERS/i, name: "Landers", category: "Food" },
  { pattern: /S\s?&\s?R\b/i, name: "S&R", category: "Food" },
  { pattern: /STARBUCKS/i, name: "Starbucks", category: "Coffee" },
  { pattern: /COFFEE\s?BEAN/i, name: "The Coffee Bean", category: "Coffee" },
  { pattern: /TIM\s?HORTONS/i, name: "Tim Hortons", category: "Coffee" },
  { pattern: /\bSHELL\b/i, name: "Shell", category: "Transport" },
  { pattern: /PETRON/i, name: "Petron", category: "Transport" },
  { pattern: /CALTEX/i, name: "Caltex", category: "Transport" },
  { pattern: /\bGRAB\b/i, name: "Grab", category: "Transport" },
  { pattern: /ANGKAS/i, name: "Angkas", category: "Transport" },
  { pattern: /\b(?:LRT|MRT)\b/i, name: "LRT/MRT", category: "Transport" },
  { pattern: /MERCURY\s?DRUG/i, name: "Mercury Drug", category: "Health" },
  { pattern: /WATSONS/i, name: "Watsons", category: "Health" },
  { pattern: /SOUTH\s?STAR\s?DRUG/i, name: "South Star Drug", category: "Health" },
  { pattern: /AMAZON/i, name: "Amazon", category: "Shopping" },
  { pattern: /LAZADA/i, name: "Lazada", category: "Shopping" },
  { pattern: /SHOPEE/i, name: "Shopee", category: "Shopping" },
  { pattern: /UNIQLO/i, name: "Uniqlo", category: "Shopping" },
  { pattern: /SM\s?(?:STORE|DEPARTMENT)/i, name: "SM Store", category: "Shopping" },
  { pattern: /MERALCO/i, name: "Meralco", category: "Home" },
  { pattern: /MAYNILAD/i, name: "Maynilad", category: "Home" },
  { pattern: /MANILA\s?WATER/i, name: "Manila Water", category: "Home" },
  { pattern: /NETFLIX/i, name: "Netflix", category: "Tools" },
  { pattern: /SPOTIFY/i, name: "Spotify", category: "Tools" },
  { pattern: /\bPLDT\b/i, name: "PLDT", category: "Tools" },
  { pattern: /GLOBE\s?TELECOM/i, name: "Globe", category: "Tools" },
  { pattern: /SMART\s?COMMUNICATIONS/i, name: "Smart", category: "Tools" },
  { pattern: /CONVERGE/i, name: "Converge", category: "Tools" },
  { pattern: /NATIONAL\s?BOOK\s?STORE/i, name: "National Book Store", category: "Education" },
];

const CATEGORY_KEYWORDS: { pattern: RegExp; category: string }[] = [
  { pattern: /SALARY|PAYROLL|PAYSLIP|NET\s?PAY/i, category: "Salary" },
  { pattern: /FREELANCE|CLIENT\s?PAYMENT|PROFESSIONAL\s?FEE/i, category: "Freelance" },
  { pattern: /PAYMENT\s?RECEIVED|RECEIVED\s?FROM|SALES\s?REPORT/i, category: "Business" },
  { pattern: /COFFEE|CAFE|LATTE|ESPRESSO|AMERICANO|FRAPP/i, category: "Coffee" },
  { pattern: /GROCER|SUPER\s?MARKET|RESTAURANT|DINE[\s-]?IN|TAKE[\s-]?OUT|MEAL|BURGER|PIZZA|CHICKEN|BAKERY|FOOD/i, category: "Food" },
  { pattern: /FUEL|GASOLINE|DIESEL|UNLEADED|PETROL|\bTOLL\b|PARKING|\bFARE\b|TAXI/i, category: "Transport" },
  { pattern: /PHARMACY|DRUG\s?STORE|MEDICINE|CLINIC|HOSPITAL|LABORATORY|DENTAL/i, category: "Health" },
  { pattern: /ELECTRIC|WATER\s?BILL|\bRENT\b|HARDWARE|FURNITURE/i, category: "Home" },
  { pattern: /INTERNET|BROADBAND|FIBER|POSTPAID|SUBSCRIPTION|PREPAID\s?LOAD/i, category: "Tools" },
  { pattern: /TUITION|SCHOOL|UNIVERSITY|BOOKSTORE/i, category: "Education" },
  { pattern: /DEPARTMENT\s?STORE|APPAREL|CLOTHING|MALL|ONLINE\s?ORDER/i, category: "Shopping" },
];

const INCOME_PATTERN =
  /SALARY|PAYROLL|PAYSLIP|NET\s?PAY|PAYMENT\s?RECEIVED|RECEIVED\s?FROM|DEPOSIT\s?SLIP|DEPOSITED|CREDITED|CLIENT\s?PAYMENT|FREELANCE|PROFESSIONAL\s?FEE|SALES\s?REPORT|ACKNOWLEDG(?:E)?MENT\s?RECEIPT|REMITTANCE\s?RECEIVED/i;

const MERCHANT_SKIP =
  /OFFICIAL\s?RECEIPT|SALES\s?INVOICE|\bRECEIPT\b|\bINVOICE\b|\bTIN\b|\bVAT\b|\bREG\b|\bTEL\b|PHONE|\bST\.?\b|STREET|\bAVE\b|AVENUE|\bROAD\b|\bRD\b|\bCITY\b|BRGY|BARANGAY|PHILIPPINES|WELCOME|THANK|CASHIER|TERMINAL|\bPOS\b|\bDATE\b|\bTIME\b|OPERATED\s?BY|BRANCH|\bINC\b\.?$/i;

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function todayIso(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function cleanLineForAmounts(line: string): string {
  return line.replace(DATE_TOKEN, " ").replace(TIME_TOKEN, " ").replace(PHONE_TOKEN, " ");
}

function lineAmounts(line: string): number[] {
  if (IDENTIFIER_LINE.test(line)) return [];
  const values: number[] = [];
  for (const match of cleanLineForAmounts(line).matchAll(AMOUNT_PATTERN)) {
    const value = Number(`${match[1].replace(/,/g, "")}.${match[2]}`);
    if (Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT) values.push(value);
  }
  return values;
}

function keywordScore(line: string): number {
  const negative = NEGATIVE_KEYWORDS.reduce(
    (sum, rule) => (rule.pattern.test(line) ? sum + rule.score : sum),
    0
  );
  const positive = POSITIVE_KEYWORDS.find((rule) => rule.pattern.test(line))?.score ?? 0;
  return positive + negative;
}

function hasKeyword(line: string): boolean {
  return [...POSITIVE_KEYWORDS, ...NEGATIVE_KEYWORDS].some((rule) => rule.pattern.test(line));
}

function scoreAmounts(lines: string[]): AmountCandidate[] {
  const raw: AmountCandidate[] = [];
  lines.forEach((line, index) => {
    const values = lineAmounts(line);
    if (!values.length) return;

    let keyword = keywordScore(line);
    const previous = lines[index - 1];
    if (!hasKeyword(line) && previous && !lineAmounts(previous).length) {
      keyword = Math.round(keywordScore(previous) * 0.8);
    }
    const base = keyword === 0 ? -10 : keyword;
    const position = index / Math.max(1, lines.length - 1) >= 0.6 ? 10 : 0;

    values.forEach((value, i) => {
      const isLast = i === values.length - 1;
      raw.push({ value, score: base + position + (isLast ? 0 : -15), line });
    });
  });

  const byValue = new Map<number, AmountCandidate & { hits: number }>();
  for (const candidate of raw) {
    const existing = byValue.get(candidate.value);
    if (!existing) {
      byValue.set(candidate.value, { ...candidate, hits: 1 });
    } else {
      existing.hits++;
      if (candidate.score > existing.score) {
        existing.score = candidate.score;
        existing.line = candidate.line;
      }
    }
  }

  const merged = [...byValue.values()].map(({ hits, ...candidate }) => ({
    ...candidate,
    score: candidate.score + Math.min(16, (hits - 1) * 8),
  }));

  const keywordMatched = merged.filter((c) => c.score > 0);
  const pool = keywordMatched.length ? keywordMatched : merged;
  const largest = pool.reduce<AmountCandidate | null>(
    (max, c) => (!max || c.value > max.value ? c : max),
    null
  );
  if (largest) largest.score += keywordMatched.length ? 10 : 15;

  return merged.sort((a, b) => b.score - a.score || b.value - a.value);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\bSm\b/g, "SM");
}

function detectMerchant(text: string, lines: string[]): MerchantRule | { name: string; category: null } | null {
  const known = MERCHANTS.find((m) => m.pattern.test(text));
  if (known) return known;

  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^A-Za-z]/g, "").length;
    const digits = line.replace(/\D/g, "").length;
    if (letters < 3 || digits > line.length * 0.3 || MERCHANT_SKIP.test(line)) continue;
    const name = line.replace(/[^A-Za-z0-9&'.\- ]/g, "").replace(/\s+/g, " ").trim();
    if (name.length >= 3) return { name: titleCase(name).slice(0, 120), category: null };
  }
  return null;
}

function validDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const oldest = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  if (date > tomorrow || date < oldest) return null;
  return toIsoDate(year, month, day);
}

function expandYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function dateFromLine(line: string): string | null {
  const upper = line.toUpperCase();

  for (const m of upper.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    const iso = validDate(Number(m[1]), Number(m[2]), Number(m[3]));
    if (iso) return iso;
  }

  for (const m of upper.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = expandYear(Number(m[3]));
    const iso = a > 12 ? validDate(year, b, a) : validDate(year, a, b) ?? validDate(year, b, a);
    if (iso) return iso;
  }

  const monthGroup = `(${MONTHS.join("|")})[A-Z]*\\.?`;
  for (const m of upper.matchAll(new RegExp(`\\b${monthGroup}\\s+(\\d{1,2}),?\\s+(\\d{2,4})\\b`, "g"))) {
    const iso = validDate(expandYear(Number(m[3])), MONTHS.indexOf(m[1]) + 1, Number(m[2]));
    if (iso) return iso;
  }
  for (const m of upper.matchAll(new RegExp(`\\b(\\d{1,2})\\s+${monthGroup},?\\s+(\\d{2,4})\\b`, "g"))) {
    const iso = validDate(expandYear(Number(m[3])), MONTHS.indexOf(m[2]) + 1, Number(m[1]));
    if (iso) return iso;
  }
  return null;
}

function detectDate(lines: string[]): string | null {
  const labelled = lines.filter((line) => /\bDATE\b/i.test(line));
  for (const line of [...labelled, ...lines]) {
    const iso = dateFromLine(line);
    if (iso) return iso;
  }
  return null;
}

function detectCurrency(text: string): string {
  if (/US\$|\bUSD\b/i.test(text)) return "USD";
  return "PHP";
}

function detectItems(lines: string[]): ReceiptItem[] {
  const stopIndex = lines.findIndex((line) => /SUB\s*-?\s*T[O0]TAL|\bT[O0]TAL\b|AMOUNT\s*DUE/i.test(line));
  const scope = stopIndex >= 0 ? lines.slice(0, stopIndex) : lines;
  const items: ReceiptItem[] = [];

  for (const line of scope) {
    if (items.length >= MAX_ITEMS) break;
    if (hasKeyword(line) || IDENTIFIER_LINE.test(line)) continue;
    const match = cleanLineForAmounts(line).match(/^(.*?[A-Za-z]{2,}.*?)\s+(?:₱|PHP|P|[^\w\s])?\s?(\d{1,3}(?:,\d{3})+|\d+)[.,](\d{2})\s*[A-Z]?$/i);
    if (!match) continue;
    const name = match[1].replace(/^\d+\s*(?:x|@|pcs?)?\s*/i, "").replace(/[^A-Za-z0-9&'.\- ]/g, "").trim();
    const amount = Number(`${match[2].replace(/,/g, "")}.${match[3]}`);
    if (name.length >= 2 && amount > 0) items.push({ name: name.slice(0, 60), amount });
  }
  return items;
}

function detectCategory(text: string, merchantCategory: string | null, type: TransactionType): string {
  const candidates = [
    merchantCategory,
    ...CATEGORY_KEYWORDS.filter((rule) => rule.pattern.test(text)).map((rule) => rule.category),
  ];
  return candidates.find((c): c is string => !!c && isCategoryAllowed(c, type)) ?? "Other";
}

function computeConfidence(ocrConfidence: number, ranked: AmountCandidate[]): number {
  const [top, runnerUp] = ranked;
  if (!top) return 0;
  let clarity: number;
  if (top.score < 30) clarity = 0.4;
  else if (!runnerUp) clarity = 1;
  else {
    const gap = top.score - runnerUp.score;
    clarity = gap >= ALTERNATIVE_SCORE_GAP ? 1 : 0.6 + (Math.max(0, gap) / ALTERNATIVE_SCORE_GAP) * 0.4;
  }
  return Math.round(0.6 * ocrConfidence + 0.4 * clarity * 100);
}

export function parseReceipt(text: string, lines: string[], ocrConfidence: number): ParsedReceipt {
  const ranked = scoreAmounts(lines);
  const top = ranked[0] ?? null;
  const alternatives = top
    ? ranked
        .slice(1)
        .filter((c) => (top.score < 30 ? true : c.score >= top.score - ALTERNATIVE_SCORE_GAP))
        .slice(0, 3)
        .map((c) => c.value)
    : [];

  const type: TransactionType = INCOME_PATTERN.test(text) ? "income" : "expense";
  const merchant = detectMerchant(text, lines);
  const detectedDate = detectDate(lines);

  return {
    amount: top?.value ?? null,
    alternatives,
    candidates: ranked,
    merchant: merchant?.name ?? null,
    date: detectedDate ?? todayIso(),
    isDateDetected: detectedDate !== null,
    currency: detectCurrency(text),
    items: detectItems(lines),
    type,
    category: detectCategory(text, merchant?.category ?? null, type),
    confidence: computeConfidence(ocrConfidence, ranked),
  };
}
