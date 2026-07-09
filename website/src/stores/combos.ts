import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Combo } from '@/types'
import { combosApi } from '@/api/combos'
import { collabApi, type SharedComboItem } from '@/api/collab'

export interface ComboWithMeta extends Combo {
  role?: 'owner' | 'admin' | 'member'
  shareCode?: string
  memberCount?: number
  todoCount?: number
  isMember?: boolean
}

export const useCombosStore = defineStore('combos', () => {
  const items = ref<ComboWithMeta[]>([])
  const loading = ref(false)

  async function fetchCombos() {
    loading.value = true
    try {
      const [ownRes, sharedRes] = await Promise.all([
        combosApi.getList(),
        collabApi.getSharedList(),
      ])

      const ownCombos: ComboWithMeta[] = (ownRes.combos || []).map((c) => ({
        ...c,
        role: 'owner' as const,
        isMember: false,
      }))

      const sharedItems: ComboWithMeta[] = (sharedRes.sharedCombos || []).map((sc) => ({
        id: sc.id,
        userId: 0,
        name: sc.name,
        description: '',
        icon: sc.icon,
        color: sc.color,
        isShared: true,
        memberLimit: 0,
        sortOrder: 0,
        role: sc.role,
        shareCode: sc.shareCode,
        memberCount: sc.memberCount,
        todoCount: sc.todoCount,
        isMember: true,
      }))

      // Merge: own combos take precedence by id
      const mergedMap = new Map<number, ComboWithMeta>()
      for (const c of ownCombos) mergedMap.set(c.id, c)
      for (const c of sharedItems) {
        if (!mergedMap.has(c.id)) {
          mergedMap.set(c.id, c)
        }
      }

      items.value = Array.from(mergedMap.values())
    } finally {
      loading.value = false
    }
  }

  async function createCombo(data: Partial<Combo>) {
    const res = await combosApi.create(data)
    if (res.success && res.combo) {
      items.value.push({ ...res.combo, role: 'owner', isMember: false })
    }
    return res
  }

  async function updateCombo(id: number, data: Partial<Combo>) {
    const res = await combosApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((c) => c.id === id)
      if (idx !== -1 && res.combo) {
        items.value[idx] = { ...items.value[idx], ...res.combo }
      }
    }
    return res
  }

  async function deleteCombo(id: number) {
    const res = await combosApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((c) => c.id !== id)
    }
    return res
  }

  return {
    items,
    loading,
    fetchCombos,
    createCombo,
    updateCombo,
    deleteCombo,
  }
})
