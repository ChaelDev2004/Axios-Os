import { handleScanReceipt, handleScannerGet } from "@/features/finance/lib/scanner-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function GET() {
  return handleScannerGet();
}

export async function POST(request: Request) {
  return handleScanReceipt(request);
}
