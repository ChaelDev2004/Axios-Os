import {
  handleCreateTypedTransaction,
  handleFinanceCollectionGetMethods,
  handleListTypedTransactions,
} from "@/features/finance/lib/finance-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleListTypedTransactions(request, "income");
}

export async function POST(request: Request) {
  return handleCreateTypedTransaction(request, "income");
}

export function PUT() {
  return handleFinanceCollectionGetMethods();
}
