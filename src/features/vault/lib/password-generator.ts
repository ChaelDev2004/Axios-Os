export type PasswordGeneratorOptions = {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS = "0123456789";
const SYMS = "!@#$%^&*()-_=+[]{};:,.?";

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
};

function pick(charset: string): string {
  const buf = crypto.getRandomValues(new Uint32Array(1));
  return charset[buf[0]! % charset.length]!;
}

export function generatePassword(options: PasswordGeneratorOptions): string {
  const length = Math.min(64, Math.max(8, Math.round(options.length)));
  let charset = "";
  const required: string[] = [];

  if (options.uppercase) {
    charset += UPPER;
    required.push(pick(UPPER));
  }
  if (options.lowercase) {
    charset += LOWER;
    required.push(pick(LOWER));
  }
  if (options.numbers) {
    charset += NUMS;
    required.push(pick(NUMS));
  }
  if (options.symbols) {
    charset += SYMS;
    required.push(pick(SYMS));
  }

  if (!charset) {
    charset = LOWER + NUMS;
  }

  const chars = [...required];
  while (chars.length < length) {
    chars.push(pick(charset));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0]! % (i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }

  return chars.join("");
}
