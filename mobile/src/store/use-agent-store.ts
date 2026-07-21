import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { secureStateStorage } from '@/services/secure-storage';
import type { UnifiedAgentSummary } from '@/services/agent';

interface AgentState {
  isBubbleVisible: boolean;
  bubblePosition: { x: number; y: number };
  latestSummary: UnifiedAgentSummary | null;
  previousSummary: UnifiedAgentSummary | null;
  reviewRequested: boolean;
  isAnalyzing: boolean;
  quotaRemaining: number;
  currentTier: string;
  maxWeeklyQuota: number;
  setBubbleVisible: (visible: boolean) => void;
  setBubblePosition: (position: { x: number; y: number }) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setReviewRequested: (requested: boolean) => void;
  setAnalysisResult: (summary: UnifiedAgentSummary | null, quotaRemaining: number, currentTier: string, maxWeeklyQuota?: number) => void;
  resetAgentStore: () => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      isBubbleVisible: true,
      bubblePosition: { x: 20, y: 120 },
      latestSummary: null,
      previousSummary: null,
      reviewRequested: false,
      isAnalyzing: false,
      quotaRemaining: 7,
      currentTier: 'free',
      maxWeeklyQuota: 7,
      setBubbleVisible: (isBubbleVisible) => set({ isBubbleVisible }),
      setBubblePosition: (bubblePosition) => set({ bubblePosition }),
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setReviewRequested: (reviewRequested) => set({ reviewRequested }),
      setAnalysisResult: (summary, quotaRemaining, currentTier, maxWeeklyQuota = 7) => {
        const currentLatest = get().latestSummary;
        set({
          previousSummary: currentLatest && currentLatest !== summary ? currentLatest : get().previousSummary,
          latestSummary: summary,
          quotaRemaining,
          currentTier,
          maxWeeklyQuota,
          isAnalyzing: false,
        });
      },
      resetAgentStore: () =>
        set({
          isBubbleVisible: true,
          bubblePosition: { x: 20, y: 120 },
          latestSummary: null,
          previousSummary: null,
          reviewRequested: false,
          isAnalyzing: false,
          quotaRemaining: 7,
          currentTier: 'free',
          maxWeeklyQuota: 7,
        }),
    }),
    {
      name: 'yacheck-agent-store-v1',
      storage: createJSONStorage(() => secureStateStorage),
      partialize: (state) => ({
        isBubbleVisible: state.isBubbleVisible,
        bubblePosition: state.bubblePosition,
        latestSummary: state.latestSummary,
        previousSummary: state.previousSummary,
        reviewRequested: state.reviewRequested,
        quotaRemaining: state.quotaRemaining,
        currentTier: state.currentTier,
        maxWeeklyQuota: state.maxWeeklyQuota,
      }),
    }
  )
);
