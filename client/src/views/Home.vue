<template>
  <div>
    <div class="page-header">
      <h2>最新帖子</h2>
      <router-link v-if="userStore.isLoggedIn" to="/posts/create" class="btn btn-primary">发布帖子</router-link>
    </div>

    <div v-if="posts.length === 0" class="empty-state">
      <p>暂无帖子，快来发布第一篇吧！</p>
    </div>

    <div v-else>
      <div v-for="post in posts" :key="post.id" class="card">
        <router-link :to="`/posts/${post.id}`" class="post-item">
          <span class="post-board">{{ post.board_name }}</span>
          <h3>{{ post.title }}</h3>
          <div class="post-meta">
            {{ post.username }} · {{ formatTime(post.created_at) }}
          </div>
        </router-link>
      </div>

      <div class="pagination">
        <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
        <span>第 {{ page }} / {{ totalPages }} 页</span>
        <button :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
const posts = ref([])
const page = ref(1)
const totalPages = ref(1)

async function fetchPosts() {
  try {
    const res = await api.get('/posts', { params: { page: page.value, pageSize: 10 } })
    posts.value = res.data.posts
    totalPages.value = res.data.totalPages
  } catch (err) {
    console.error('Fetch posts error:', err)
  }
}

function changePage(p) {
  page.value = p
  fetchPosts()
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(fetchPosts)
</script>
