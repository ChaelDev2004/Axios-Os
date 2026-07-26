"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  forgotPinSchema,
  type ForgotPinInput,
} from "@/features/auth/schemas/auth.schemas";
import { forgotPinAction } from "@/features/auth/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPinForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPinInput>({
    resolver: zodResolver(forgotPinSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    setLoading(true);
    const result = await forgotPinAction(data);
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    setSent(true);
    toast.success(result.message);
  });

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          We sent a secure link to your email. After verifying your account,
          you&apos;ll be able to create a new PIN.
        </p>
        <Link href="/auth/login">
          <Button variant="outline" className="w-full">
            Back to login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/auth/login" className="underline-offset-4 hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
