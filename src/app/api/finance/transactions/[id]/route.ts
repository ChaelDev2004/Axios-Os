import {
  handleDeleteTransaction,
  handleFinanceItemGetMethods,
  handleGetTransaction,
  handleUpdateTransaction,
} from "@/features/finance/lib/finance-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetTransaction(request, id);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateTransaction(request, id);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteTransaction(request, id);
}

export function POST() {
  return handleFinanceItemGetMethods();
}
