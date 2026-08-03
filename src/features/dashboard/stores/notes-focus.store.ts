"use client";

import { create } from "zustand";

type NotesFocusState = {
  taskId: string | null;
  dueDate: string | null;
  createDraft: boolean;
  setFocus: (next: {
    taskId?: string | null;
    dueDate?: string | null;
    createDraft?: boolean;
  }) => void;
  clearFocus: () => void;
};

export const useNotesFocusStore = create<NotesFocusState>((set) => ({
  taskId: null,
  dueDate: null,
  createDraft: false,
  setFocus: (next) =>
    set({
      taskId: next.taskId === undefined ? null : next.taskId,
      dueDate: next.dueDate === undefined ? null : next.dueDate,
      createDraft: Boolean(next.createDraft),
    }),
  clearFocus: () => set({ taskId: null, dueDate: null, createDraft: false }),
}));
