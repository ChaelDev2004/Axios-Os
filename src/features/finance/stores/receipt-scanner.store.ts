"use client";

import { create } from "zustand";

interface ReceiptScannerState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useReceiptScannerStore = create<ReceiptScannerState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
