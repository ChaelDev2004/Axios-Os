"use client";

import { create } from "zustand";

type NotesFocusState = {
  taskId: string | null;
  dueDate: string | null;
  noteId: string | null;
  createDraft: boolean;
  setFocus: (next: {
    taskId?: string | null;
    dueDate?: string | null;
    noteId?: string | null;
    createDraft?: boolean;
  }) => void;
  clearFocus: () => void;
};

export const useNotesFocusStore = create<NotesFocusState>((set) => ({
  taskId: null,
  dueDate: null,
  noteId: null,
  createDraft: false,
  setFocus: (next) =>
    set({
      taskId: next.taskId === undefined ? null : next.taskId,
      dueDate: next.dueDate === undefined ? null : next.dueDate,
      noteId: next.noteId === undefined ? null : next.noteId,
      createDraft: Boolean(next.createDraft),
    }),
  clearFocus: () =>
    set({ taskId: null, dueDate: null, noteId: null, createDraft: false }),
}));
