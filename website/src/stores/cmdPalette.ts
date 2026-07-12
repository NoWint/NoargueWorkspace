import { create } from 'zustand'

interface CmdPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useCmdPaletteStore = create<CmdPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
