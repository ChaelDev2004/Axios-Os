import { handleFinanceSummary } from "@/features/finance/lib/finance-http";
import { methodNotAllowed } from "@/lib/api-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleFinanceSummary(request);
}

export function POST() {
  return methodNotAllowed("GET");
}
