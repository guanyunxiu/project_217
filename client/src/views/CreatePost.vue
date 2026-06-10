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
        <label>正文 <span class="editor-hint">支持 Markdown 语法</span></label>
        <EditorToolbar v-model="form.content" />
        <div class="editor-mode-toggle" style="padding:4px 10px;background:#fafbfc;border:1px solid #ddd;border-bottom:none;">
          <button class="editor-mode-btn" :class="{ active: editorMode === 'edit' }" @click="editorMode = 'edit'">编辑</button>
          <button class="editor-mode-btn" :class="{ active: editorMode === 'split' }" @click="editorMode = 'split'">分屏</button>
          <button class="editor-mode-btn" :class="{ active: editorMode === 'preview' }" @click="editorMode = 'preview'">预览</button>
        </div>
        <div v-if="editorMode === 'edit'" class="editor-single">
          <textarea v-model="form.content" placeholder="输入帖子内容，支持 Markdown 语法，可以使用 @username 提及其他用户"></textarea>
        </div>
        <div v-else-if="editorMode === 'split'" class="editor-with-preview">
          <textarea v-model="form.content" placeholder="输入帖子内容"></textarea>
          <div class="editor-preview markdown-body" v-html="renderMarkdown(form.content)"></div>
        </div>
        <div v-else class="editor-preview-only markdown-body" v-html="renderMarkdown(form.content)"></div>
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
import EditorToolbar from '../components/EditorToolbar.vue'
import { renderMarkdown } from '../utils/markdown'

const route = useRoute()
const router = useRouter()

const boards = ref([])
const editorMode = ref('split')
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
