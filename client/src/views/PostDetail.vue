<template>
  <div v-if="post">
    <div class="card">
      <h1 class="post-detail-title">{{ post.title }}</h1>
      <div class="post-detail-meta">
        <span class="post-board" style="margin-right:8px;">{{ post.board_name }}</span>
        {{ post.username }} · {{ formatTime(post.created_at) }}
        <span v-if="post.updated_at !== post.created_at"> · 编辑于 {{ formatTime(post.updated_at) }}</span>
        <button v-if="userStore.isLoggedIn && userStore.user?.id !== post.user_id" class="btn btn-secondary" style="margin-left:12px;padding:4px 12px;font-size:12px;" @click="sendPrivateMessage">发私信</button>
      </div>
      <div class="post-detail-content markdown-body" v-html="renderMarkdown(post.content)"></div>
    </div>

    <div style="margin-top:24px;">
      <h3 class="section-title">评论 ({{ comments.length }})</h3>

      <div v-if="userStore.isLoggedIn" class="card" style="margin-top:12px;">
        <div class="form-group">
          <EditorToolbar v-model="commentContent" />
          <div class="editor-mode-toggle" style="padding:4px 10px;background:#fafbfc;border:1px solid #ddd;border-bottom:none;">
            <button class="editor-mode-btn" :class="{ active: commentMode === 'edit' }" @click="commentMode = 'edit'">编辑</button>
            <button class="editor-mode-btn" :class="{ active: commentMode === 'split' }" @click="commentMode = 'split'">分屏</button>
            <button class="editor-mode-btn" :class="{ active: commentMode === 'preview' }" @click="commentMode = 'preview'">预览</button>
          </div>
          <div v-if="commentMode === 'edit'">
            <textarea v-model="commentContent" placeholder="发表评论，支持 Markdown 语法，使用 @username 提及其他用户" style="min-height:80px;"></textarea>
          </div>
          <div v-else-if="commentMode === 'split'" class="editor-with-preview">
            <textarea v-model="commentContent" placeholder="发表评论..." style="min-height:80px;"></textarea>
            <div class="editor-preview markdown-body" v-html="renderMarkdown(commentContent)" style="max-height:200px;"></div>
          </div>
          <div v-else class="editor-preview-only markdown-body" v-html="renderMarkdown(commentContent)" style="max-height:200px;min-height:80px;"></div>
        </div>
        <div v-if="commentError" class="error-message">{{ commentError }}</div>
        <button class="btn btn-primary" @click="handleComment" :disabled="commentLoading">
          {{ commentLoading ? '发表中...' : '发表评论' }}
        </button>
      </div>

      <div v-if="comments.length === 0" class="empty-state">
        <p>暂无评论</p>
      </div>

      <div v-else class="card">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div>
            <span class="comment-author">{{ comment.username }}</span>
            <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
          </div>
          <div class="comment-content markdown-body" v-html="renderMarkdown(comment.content)"></div>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <p>加载中...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../utils/api'
import { useUserStore } from '../stores/user'
import { usePrivateMessageStore } from '../stores/privateMessage'
import { renderMarkdown } from '../utils/markdown'
import EditorToolbar from '../components/EditorToolbar.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const pmStore = usePrivateMessageStore()

const post = ref(null)
const comments = ref([])
const commentContent = ref('')
const commentError = ref('')
const commentLoading = ref(false)
const commentMode = ref('edit')

async function fetchPost() {
  try {
    const res = await api.get(`/posts/${route.params.id}`)
    post.value = res.data
  } catch (err) {
    console.error('Fetch post error:', err)
  }
}

async function fetchComments() {
  try {
    const res = await api.get(`/comments/post/${route.params.id}`)
    comments.value = res.data
  } catch (err) {
    console.error('Fetch comments error:', err)
  }
}

async function handleComment() {
  commentError.value = ''
  if (!commentContent.value.trim()) {
    commentError.value = '评论内容不能为空'
    return
  }
  commentLoading.value = true
  try {
    await api.post('/comments', {
      content: commentContent.value,
      post_id: parseInt(route.params.id)
    })
    commentContent.value = ''
    commentMode.value = 'edit'
    fetchComments()
  } catch (err) {
    commentError.value = err.response?.data?.message || '评论失败'
  } finally {
    commentLoading.value = false
  }
}

function sendPrivateMessage() {
  if (!post.value) return
  pmStore.openConversation(post.value.user_id)
  router.push('/messages')
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

watch(() => route.params.id, () => {
  if (route.params.id) {
    fetchPost()
    fetchComments()
  }
})

onMounted(() => {
  fetchPost()
  fetchComments()
})
</script>
