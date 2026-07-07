import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Combo } from '@/types'
import { combosApi } from '@/api/combos'

export const useCombosStore = defineStore('combos', () => {
  const items = ref<Combo[]>([])
  const loading = ref(false)
  const selectedId = ref<number | null>(null)

  async function fetchCombos() {
    loading.value = true
    try {
      const res = await combosApi.getList()
      if (res.success && res.combos) {
        items.value = Array.isArray(res.combos) ? res.combos : []
      }
    } finally {
      loading.value = false
    }
  }

  function selectCombo(id: number | null) {
    selectedId.value = id
  }

  async function createCombo(data: Partial<Combo>) {
    const res = await combosApi.create(data)
    if (res.success && res.combo) {
      items.value.push(res.combo)
    }
    return res
  }

  async function updateCombo(id: number, data: Partial<Combo>) {
    const res = await combosApi.update(id, data)
    if (res.success) {
      const idx = items.value.findIndex((c) => c.id === id)
      if (idx !== -1 && res.combo) items.value[idx] = res.combo
    }
    return res
  }

  async function deleteCombo(id: number) {
    const res = await combosApi.delete(id)
    if (res.success) {
      items.value = items.value.filter((c) => c.id !== id)
      if (selectedId.value === id) selectedId.value = null
    }
    return res
  }

  return {
    items,
    loading,
    selectedId,
    fetchCombos,
    selectCombo,
    createCombo,
    updateCombo,
    deleteCombo,
  }
})
