<template>
  <div>
    <div class="page-header">
      <h2>我的通知</h2>
      <button v-if="notifications.some(n => !n.is_read)" class="btn btn-secondary" @click="markAllRead">
        全部标记已读
      </button>
    </div>

    <div v-if="notifications.length === 0" class="empty-state">
      <p>暂无通知</p>
    </div>

    <div v-else class="card">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="notification-item"
        :class="{ unread: !notif.is_read }"
        @click="handleClick(notif)"
      >
        <div v-if="!notif.is_read" class="notification-dot"></div>
        <div class="notification-content">
          <div class="notification-text">
            <strong v-if="notif.from_username">{{ notif.from_username }}</strong>
            {{ notif.content }}
          </div>
          <div class="notification-time">{{ formatTime(notif.created_at) }}</div>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>第 {{ page }} 页</span>
      <button :disabled="notifications.length < pageSize" @click="changePage(page + 1)">下一页</button>
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
const notifications = ref([])
const page = ref(1)
const pageSize = 20

async function fetchNotifications() {
  try {
    const res = await api.get('/notifications', { params: { page: page.value, pageSize } })
    notifications.value = res.data.notifications
  } catch (err) {
    console.error('Fetch notifications error:', err)
  }
}

async function markAsRead(id) {
  try {
    await api.put(`/notifications/${id}/read`)
    const notif = notifications.value.find(n => n.id === id)
    if (notif) notif.is_read = 1
    userStore.fetchUnreadCount()
  } catch (err) {
    console.error('Mark as read error:', err)
  }
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all')
    notifications.value.forEach(n => n.is_read = 1)
    userStore.fetchUnreadCount()
  } catch (err) {
    console.error('Mark all read error:', err)
  }
}

function handleClick(notif) {
  if (!notif.is_read) {
    markAsRead(notif.id)
  }
  if (notif.related_id) {
    router.push(`/posts/${notif.related_id}`)
  }
}

function changePage(p) {
  page.value = p
  fetchNotifications()
}

function formatTime(t) {
  if (!t) return ''
  return new Date(t).toLocaleString('zh-CN')
}

onMounted(fetchNotifications)
</script>
