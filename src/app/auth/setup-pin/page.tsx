import { redirect } from "next/navigation";
import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { SetupPinForm } from "@/features/auth/components/SetupPinForm";
import { getProfile, getSession } from "@/features/auth/services/auth.service";

export default async function SetupPinPage() {
  const user = await getSession();
  if (!user) redirect("/auth/login");

  const profile = await getProfile();
  if (profile?.has_pin) redirect("/dashboard");

  return (
    <AuthLayout
      title="Create security PIN"
      subtitle="Set a 6-digit PIN for fast, secure login."
    >
      <SetupPinForm mode="setup" />
    </AuthLayout>
  );
}
