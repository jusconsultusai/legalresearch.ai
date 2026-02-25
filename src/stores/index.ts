import { create } from "zustand";
import type { AuthUser } from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => {
    set({ user: null, isLoading: false });
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    window.location.href = "/signin";
  },
}));

interface ChatState {
  mode: string;
  sources: string[];
  setMode: (mode: string) => void;
  setSources: (sources: string[]) => void;
  toggleSource: (source: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  mode: "standard_v2",
  sources: ["law", "jurisprudence"],
  setMode: (mode) => set({ mode }),
  setSources: (sources) => set({ sources }),
  toggleSource: (source) =>
    set((state) => ({
      sources: state.sources.includes(source)
        ? state.sources.filter((s) => s !== source)
        : [...state.sources, source],
    })),
}));

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isOpen: true,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (isOpen) => set({ isOpen }),
}));

interface TourState {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  end: () => void;
  setStep: (step: number) => void;
}

export const useTourStore = create<TourState>((set) => ({
  isActive: false,
  currentStep: 0,
  totalSteps: 8,
  start: () => set({ isActive: true, currentStep: 0 }),
  next: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
    })),
  prev: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),
  end: () => set({ isActive: false, currentStep: 0 }),
  setStep: (step) => set({ currentStep: step }),
}));

interface SignupModalState {
  isOpen: boolean;
  currentStep: number;
  triggerFeature?: string;
  open: (feature?: string) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
}

export const useSignupModalStore = create<SignupModalState>((set) => ({
  isOpen: false,
  currentStep: 0,
  triggerFeature: undefined,
  open: (feature) => set({ isOpen: true, currentStep: 0, triggerFeature: feature }),
  close: () => set({ isOpen: false, triggerFeature: undefined }),
  next: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prev: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
  reset: () => set({ isOpen: false, currentStep: 0, triggerFeature: undefined }),
}));

/* Chat management store — shared between sidebar (chat list) and chat page */
interface ChatManagementState {
  /** ID of the chat the sidebar wants the chat page to load */
  activeChatId: string | null;
  /** Increment to signal sidebar to re-fetch the chat list */
  refreshKey: number;
  setActiveChatId: (id: string | null) => void;
  triggerRefresh: () => void;
}

export const useChatManagement = create<ChatManagementState>((set) => ({
  activeChatId: null,
  refreshKey: 0,
  setActiveChatId: (id) => set({ activeChatId: id }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
