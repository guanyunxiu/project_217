<template>
  <div>
    <div class="page-header">
      <h2>板块列表</h2>
      <button v-if="userStore.isAdmin" class="btn btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '取消' : '创建板块' }}
      </button>
    </div>

    <div v-if="showCreateForm" class="card" style="margin-bottom:20px;">
      <div class="form-group">
        <label>板块名称</label>
        <input v-model="newBoard.name" type="text" placeholder="输入板块名称" />
      </div>
      <div class="form-group">
        <label>板块描述</label>
        <textarea v-model="newBoard.description" placeholder="输入板块描述"></textarea>
      </div>
      <div v-if="createError" class="error-message">{{ createError }}</div>
      <button class="btn btn-primary" @click="handleCreateBoard" :disabled="creating">
        {{ creating ? '创建中...' : '确认创建' }}
      </button>
    </div>

    <div v-if="boards.length === 0" class="empty-state">
      <p>暂无板块</p>
    </div>

    <div v-else class="board-grid">
      <div v-for="board in boards" :key="board.id" class="board-card" @click="goToBoard(board.id)">
        <h3>{{ board.name }}</h3>
        <p>{{ board.description || '暂无描述' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const boards = ref([])
const showCreateForm = ref(false)
const newBoard = ref({ name: '', description: '' })
const createError = ref('')
const creating = ref(false)

async function fetchBoards() {
  try {
    const res = await api.get('/boards')
    boards.value = res.data
  } catch (err) {
    console.error('Fetch boards error:', err)
  }
}

function goToBoard(id) {
  router.push(`/boards/${id}/posts`)
}

async function handleCreateBoard() {
  createError.value = ''
  if (!newBoard.value.name) {
    createError.value = '板块名称不能为空'
    return
  }
  creating.value = true
  try {
    await api.post('/boards', newBoard.value)
    showCreateForm.value = false
    newBoard.value = { name: '', description: '' }
    fetchBoards()
  } catch (err) {
    createError.value = err.response?.data?.message || '创建失败'
  } finally {
    creating.value = false
  }
}

onMounted(fetchBoards)
</script>
