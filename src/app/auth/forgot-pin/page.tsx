import { AuthLayout } from "@/features/auth/components/AuthLayout";
import { ForgotPinForm } from "@/features/auth/components/ForgotPinForm";

export default function ForgotPinPage() {
  return (
    <AuthLayout
      title="Forgot PIN?"
      subtitle="We'll email you a secure link to verify your account and reset your PIN."
    >
      <ForgotPinForm />
    </AuthLayout>
  );
}
