"use client";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export async function confirmDeleteNote(title?: string): Promise<boolean> {
  const label = title?.trim() || "this note";
  const result = await Swal.fire({
    title: "Delete note?",
    html: `This will permanently remove <strong>${escapeHtml(label)}</strong>.`,
    icon: "warning",
    showCancelButton: true,
    focusCancel: true,
    confirmButtonText: "Yes, delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function noteDeletedAlert(): Promise<void> {
  await Swal.fire({
    title: "Deleted",
    text: "Note removed successfully.",
    icon: "success",
    timer: 1400,
    showConfirmButton: false,
    timerProgressBar: true,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
