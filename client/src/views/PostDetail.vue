<template>
  <div v-if="post">
    <div class="card">
      <h1 class="post-detail-title">{{ post.title }}</h1>
      <div class="post-detail-meta">
        <span class="post-board" style="margin-right:8px;">{{ post.board_name }}</span>
        {{ post.username }} · {{ formatTime(post.created_at) }}
        <span v-if="post.updated_at !== post.created_at"> · 编辑于 {{ formatTime(post.updated_at) }}</span>
      </div>
      <div class="post-detail-content" v-html="renderContent(post.content)"></div>
    </div>

    <div style="margin-top:24px;">
      <h3 class="section-title">评论 ({{ comments.length }})</h3>

      <div v-if="userStore.isLoggedIn" class="card" style="margin-top:12px;">
        <div class="form-group">
          <textarea v-model="commentContent" placeholder="发表评论，使用 @username 提及其他用户" style="min-height:80px;"></textarea>
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
          <div class="comment-content" v-html="renderContent(comment.content)"></div>
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
import { useRoute } from 'vue-router'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const userStore = useUserStore()

const post = ref(null)
const comments = ref([])
const commentContent = ref('')
const commentError = ref('')
const commentLoading = ref(false)

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
    fetchComments()
  } catch (err) {
    commentError.value = err.response?.data?.message || '评论失败'
  } finally {
    commentLoading.value = false
  }
}

function renderContent(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/@(\w+)/g, '<span class="mention-highlight">@$1</span>')
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
