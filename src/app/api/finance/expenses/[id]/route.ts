import {
  handleDeleteTypedTransaction,
  handleFinanceItemGetMethods,
  handleGetTypedTransaction,
  handleUpdateTypedTransaction,
} from "@/features/finance/lib/finance-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleGetTypedTransaction(request, id, "expense");
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleUpdateTypedTransaction(request, id, "expense");
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleDeleteTypedTransaction(request, id, "expense");
}

export function POST() {
  return handleFinanceItemGetMethods();
}
