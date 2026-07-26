"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      mobileOffset={{ top: "120px" }}
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "auth-glass border border-border",
        },
      }}
    />
  );
}
