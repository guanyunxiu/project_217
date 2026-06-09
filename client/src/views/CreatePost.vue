<template>
  <div>
    <div class="page-header">
      <h2>发布帖子</h2>
    </div>

    <div class="card">
      <div v-if="error" class="error-message">{{ error }}</div>
      <div class="form-group">
        <label>所属板块</label>
        <select v-model="form.board_id">
          <option value="">请选择板块</option>
          <option v-for="board in boards" :key="board.id" :value="board.id">{{ board.name }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>标题</label>
        <input v-model="form.title" type="text" placeholder="输入帖子标题" />
      </div>
      <div class="form-group">
        <label>正文</label>
        <textarea v-model="form.content" placeholder="输入帖子内容，可以使用 @username 提及其他用户"></textarea>
      </div>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-primary" @click="handleSubmit" :disabled="loading">
          {{ loading ? '发布中...' : '发布帖子' }}
        </button>
        <button class="btn btn-secondary" @click="$router.back()">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../utils/api'

const route = useRoute()
const router = useRouter()

const boards = ref([])
const form = ref({
  board_id: route.query.board_id || '',
  title: '',
  content: ''
})
const error = ref('')
const loading = ref(false)

async function fetchBoards() {
  try {
    const res = await api.get('/boards')
    boards.value = res.data
  } catch (err) {
    console.error('Fetch boards error:', err)
  }
}

async function handleSubmit() {
  error.value = ''
  if (!form.value.board_id) {
    error.value = '请选择板块'
    return
  }
  if (!form.value.title) {
    error.value = '请输入标题'
    return
  }
  if (!form.value.content) {
    error.value = '请输入正文'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/posts', form.value)
    router.push(`/posts/${res.data.post.id}`)
  } catch (err) {
    error.value = err.response?.data?.message || '发布失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchBoards)
</script>
