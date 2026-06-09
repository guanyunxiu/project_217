<template>
  <div>
    <div class="page-header">
      <h2>{{ boardName }} - 帖子列表</h2>
      <router-link v-if="userStore.isLoggedIn" :to="`/posts/create?board_id=${boardId}`" class="btn btn-primary">
        在此板块发帖
      </router-link>
    </div>

    <div v-if="posts.length === 0" class="empty-state">
      <p>该板块暂无帖子</p>
    </div>

    <div v-else>
      <div v-for="post in posts" :key="post.id" class="card">
        <router-link :to="`/posts/${post.id}`" class="post-item">
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
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../utils/api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const userStore = useUserStore()
const boardId = ref(route.params.id)
const boardName = ref('')
const posts = ref([])
const page = ref(1)
const totalPages = ref(1)

async function fetchPosts() {
  try {
    const res = await api.get('/posts', { params: { board_id: boardId.value, page: page.value, pageSize: 10 } })
    posts.value = res.data.posts
    totalPages.value = res.data.totalPages
    if (posts.value.length > 0) {
      boardName.value = posts.value[0].board_name
    }
  } catch (err) {
    console.error('Fetch board posts error:', err)
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

watch(() => route.params.id, (newId) => {
  if (newId) {
    boardId.value = newId
    page.value = 1
    fetchPosts()
  }
})

onMounted(fetchPosts)
</script>
