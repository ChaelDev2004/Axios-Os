import {
  handleCreateTransaction,
  handleFinanceCollectionGetMethods,
  handleListTransactions,
} from "@/features/finance/lib/finance-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleListTransactions(request);
}

export async function POST(request: Request) {
  return handleCreateTransaction(request);
}

export function PUT() {
  return handleFinanceCollectionGetMethods();
}
