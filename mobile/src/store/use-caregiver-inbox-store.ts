import { create } from 'zustand';

import type { CaregiverNudge } from '@/services/caregiver';

interface CaregiverInboxState {
  messages: CaregiverNudge[];
  loading: boolean;
  error: string;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  setMessages: (messages: CaregiverNudge[]) => void;
  upsertMessage: (message: CaregiverNudge) => void;
  markRead: (messageId: string, readAt?: string) => void;
  reset: () => void;
}

const newestFirst = (left: CaregiverNudge, right: CaregiverNudge) => right.createdAt.localeCompare(left.createdAt);

export const useCaregiverInboxStore = create<CaregiverInboxState>((set) => ({
  messages: [],
  loading: false,
  error: '',
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setMessages: (messages) => set({ messages: [...messages].sort(newestFirst), loading: false, error: '' }),
  upsertMessage: (message) => set((state) => ({
    messages: [message, ...state.messages.filter((item) => item.id !== message.id)].sort(newestFirst),
  })),
  markRead: (messageId, readAt = new Date().toISOString()) => set((state) => ({
    messages: state.messages.map((item) => item.id === messageId ? { ...item, readAt } : item),
  })),
  reset: () => set({ messages: [], loading: false, error: '' }),
}));

export const selectUnreadCaregiverMessageCount = (state: CaregiverInboxState) => (
  state.messages.filter((message) => !message.readAt).length
);
