
import { create } from 'zustand';

interface PageState {
  currentTitle: string;
  setPageTitle: (title: string) => void;
}

export const usePageStore = create<PageState>((set) => ({
  currentTitle: 'Dashboard',
  setPageTitle: (title: string) => set({ currentTitle: title }),
}));
