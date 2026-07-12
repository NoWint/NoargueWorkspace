import { create } from 'zustand'
import type { Combo } from '@/types'
import { combosApi } from '@/api/combos'

interface ComboState {
  combos: Combo[]
  sharedCombos: Combo[]
  loading: boolean
  fetchCombos: () => Promise<void>
  createCombo: (data: Partial<Combo>) => Promise<Combo>
  updateCombo: (id: number, data: Partial<Combo>) => Promise<void>
  deleteCombo: (id: number) => Promise<void>
}

export const useComboStore = create<ComboState>((set, get) => ({
  combos: [],
  sharedCombos: [],
  loading: false,

  fetchCombos: async () => {
    try {
      set({ loading: true })
      const comboRes = await combosApi.getList()
      set({
        combos: comboRes.combos || [],
        sharedCombos: [],
      })
    } finally {
      set({ loading: false })
    }
  },

  createCombo: async (data) => {
    const res = await combosApi.create(data)
    if (res.success && res.combo) {
      set({ combos: [...get().combos, res.combo] })
      return res.combo
    }
    throw new Error(res.message || '创建失败')
  },

  updateCombo: async (id, data) => {
    const res = await combosApi.update(id, data)
    if (res.success && res.combo) {
      set({
        combos: get().combos.map((c) => (c.id === id ? res.combo! : c)),
      })
    }
  },

  deleteCombo: async (id) => {
    await combosApi.delete(id)
    set({ combos: get().combos.filter((c) => c.id !== id) })
  },
}))
