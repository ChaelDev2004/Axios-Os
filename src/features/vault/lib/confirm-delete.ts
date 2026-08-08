"use client";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export async function confirmDeleteCredential(name?: string): Promise<boolean> {
  const label = name?.trim() || "this credential";
  const result = await Swal.fire({
    title: "Delete Credential?",
    html: `Are you sure you want to permanently delete <strong>${escapeHtml(label)}</strong>?`,
    icon: "warning",
    showCancelButton: true,
    focusCancel: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
