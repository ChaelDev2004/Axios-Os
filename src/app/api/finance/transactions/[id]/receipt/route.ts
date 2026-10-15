import { handleTransactionReceipt } from "@/features/finance/lib/finance-http";
import { methodNotAllowed } from "@/lib/api-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleTransactionReceipt(request, id);
}

export function POST() {
  return methodNotAllowed("GET");
}
