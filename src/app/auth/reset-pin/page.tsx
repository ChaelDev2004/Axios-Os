import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SetupPinForm } from "@/features/auth/components/SetupPinForm";
import { getSession } from "@/features/auth/services/auth.service";

export default async function ResetPinPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login?redirect=/auth/reset-pin");

  return (
    <AuthLayout
      title="Reset your PIN"
      subtitle="Create a new 6-digit PIN after verifying your email."
    >
      <SetupPinForm mode="reset" />
    </AuthLayout>
  );
}
