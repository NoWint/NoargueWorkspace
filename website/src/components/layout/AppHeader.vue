<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useTodosStore } from '@/stores/todos'
import { ref } from 'vue'

const authStore = useAuthStore()
const router = useRouter()
const todosStore = useTodosStore()

const searchText = ref('')

function handleSearch() {
  todosStore.filter.search = searchText.value
  todosStore.fetchTodos()
}

function clearSearch() {
  searchText.value = ''
  todosStore.filter.search = ''
  todosStore.fetchTodos()
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <t-input
        v-model="searchText"
        placeholder="搜索待办..."
        size="medium"
        class="search-input"
        @keyup.enter="handleSearch"
      >
        <template #suffix-icon>
          <t-icon
            :name="searchText ? 'close-circle' : 'search'"
            size="16px"
            @click="searchText ? clearSearch() : handleSearch()"
          />
        </template>
      </t-input>
    </div>
    <div class="header-right">
      <t-avatar
        v-if="authStore.user"
        :image="authStore.user.avatarUrl"
        :alt="authStore.user.nickname"
        size="32px"
        class="user-avatar"
        @click="router.push('/user-center')"
      />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.header-left {
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-avatar {
  cursor: pointer;
}
</style>
