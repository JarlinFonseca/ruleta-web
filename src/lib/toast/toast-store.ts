import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';
export type Toast = { id: number; kind: ToastKind; message: string; supportCode: string | null };

type ToastState = {
  toasts: Toast[];
  show: (toast: Omit<Toast, 'id' | 'supportCode'> & { supportCode?: string | null }) => number;
  dismiss: (id: number) => void;
  clear: () => void;
};

let nextId = 1;
const AUTO_DISMISS_MS = 7000;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  show: ({ kind, message, supportCode = null }) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message, supportCode }] }));
    setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  success: (message: string) => useToastStore.getState().show({ kind: 'success', message }),
  info: (message: string) => useToastStore.getState().show({ kind: 'info', message }),
  error: (message: string, supportCode: string | null = null) =>
    useToastStore.getState().show({ kind: 'error', message, supportCode }),
};
