import { create } from "zustand";

interface UiState {
  menuOpen: boolean;
  setMenuOpen: (menuOpen: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
}));
