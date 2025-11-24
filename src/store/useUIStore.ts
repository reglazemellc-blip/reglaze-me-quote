// -------------------------------------------------------------
// useUIStore.ts — global UI controller (client drawer, etc.)
// -------------------------------------------------------------

import { create } from "zustand";

type DrawerInitial = {
  name?: string;
  phone?: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type UIState = {
  clientDrawerOpen: boolean;
  clientDrawerInitial: DrawerInitial | null;
  openClientDrawer: (initial?: DrawerInitial) => void;
  closeClientDrawer: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  clientDrawerOpen: false,
  clientDrawerInitial: null,

  openClientDrawer: (initial = {}) =>
    set({
      clientDrawerOpen: true,
      clientDrawerInitial: initial,
    }),

  closeClientDrawer: () =>
    set({
      clientDrawerOpen: false,
      clientDrawerInitial: null,
    }),
}));
