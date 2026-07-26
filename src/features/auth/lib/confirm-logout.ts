"use client";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import { logoutAction } from "@/features/auth/actions/auth.actions";

export async function confirmAndLogout(): Promise<void> {
  const confirm = await Swal.fire({
    title: "Sign out?",
    text: "You'll need to sign in again to access your workspace.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, sign out",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#6366f1",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });

  if (!confirm.isConfirmed) return;

  await Swal.fire({
    title: "Goodbye!",
    text: "You have been signed out successfully.",
    icon: "success",
    timer: 1400,
    showConfirmButton: false,
    timerProgressBar: true,
  });

  await logoutAction();
}
