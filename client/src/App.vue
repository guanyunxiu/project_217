<template>
  <div id="app">
    <nav class="navbar">
      <div class="container">
        <router-link to="/" class="navbar-brand">兴趣小组论坛</router-link>
        <div class="navbar-links">
          <router-link to="/">首页</router-link>
          <router-link to="/boards">板块</router-link>
          <template v-if="userStore.isLoggedIn">
            <router-link to="/posts/create">发帖</router-link>
            <router-link to="/chat">聊天</router-link>
            <router-link to="/messages" class="nav-link-with-badge">
              私信
              <span v-if="pmStore.totalUnread > 0" class="badge">{{ pmStore.totalUnread > 99 ? '99+' : pmStore.totalUnread }}</span>
              <span v-else-if="hasNewPM" class="red-dot"></span>
            </router-link>
            <div class="nav-link-with-badge" style="position:relative;">
              <router-link to="/notifications">
                通知
                <span v-if="userStore.unreadCount > 0" class="badge">{{ userStore.unreadCount > 99 ? '99+' : userStore.unreadCount }}</span>
                <span v-else-if="hasNewNotif" class="red-dot"></span>
              </router-link>
              <button class="nav-notif-bell" @click.stop="toggleNotifPanel">🔔</button>
              <div v-if="showNotifPanel" class="nav-notification-panel" @click.stop>
                <div class="nav-notification-panel-header">
                  <h4>通知</h4>
                  <button v-if="panelNotifications.some(n => !n.is_read)" @click="markAllRead">全部已读</button>
                </div>
                <div v-if="panelNotifications.length === 0" class="nav-notification-empty">
                  暂无通知
                </div>
                <div
                  v-for="notif in panelNotifications"
                  :key="notif.id"
                  class="nav-notification-item"
                  :class="{ unread: !notif.is_read }"
                  @click="handleNotifClick(notif)"
                >
                  <div v-if="!notif.is_read" class="nav-notification-item-dot"></div>
                  <div class="nav-notification-item-content">
                    <div class="nav-notification-item-text">
                      <strong v-if="notif.from_username">{{ notif.from_username }}</strong>
                      {{ notif.content }}
                    </div>
                    <div class="nav-notification-item-time">{{ formatTime(notif.created_at) }}</div>
                  </div>
                </div>
                <router-link to="/notifications" class="nav-notification-view-all" @click="showNotifPanel = false">
                  查看全部通知
                </router-link>
              </div>
            </div>
            <span style="font-size:14px;color:#666;">{{ userStore.user?.username }}</span>
            <button @click="handleLogout">退出</button>
          </template>
          <template v-else>
            <router-link to="/login">登录</router-link>
            <router-link to="/register">注册</router-link>
          </template>
        </div>
      </div>
    </nav>
    <main class="container" style="padding-top:20px;padding-bottom:40px;">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from './stores/user'
import { usePrivateMessageStore } from './stores/privateMessage'
import { getSocket } from './utils/socket'
import api from './utils/api'

const router = useRouter()
const userStore = useUserStore()
const pmStore = usePrivateMessageStore()

const hasNewPM = ref(false)
const hasNewNotif = ref(false)
const showNotifPanel = ref(false)
const panelNotifications = ref([])

function handleLogout() {
  userStore.logout()
  window.location.href = '/login'
}

function handleNotification() {
  userStore.fetchUnreadCount()
  hasNewNotif.value = true
  setTimeout(() => { hasNewNotif.value = false }, 5000)
  if (showNotifPanel.value) {
    fetchPanelNotifications()
  }
  playNotificationSound()
}

function handlePrivateMessage() {
  pmStore.fetchUnreadCount()
  hasNewPM.value = true
  setTimeout(() => { hasNewPM.value = false }, 5000)
  if (showNotifPanel.value) {
    fetchPanelNotifications()
  }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    osc.type = 'sine'
    gain.gain.value = 0.1
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 1000
      osc2.type = 'sine'
      gain2.gain.value = 0.1
      osc2.start()
      osc2.stop(ctx.currentTime + 0.15)
    }, 150)
  } catch {
    // ignore audio errors
  }
}

async function toggleNotifPanel() {
  showNotifPanel.value = !showNotifPanel.value
  if (showNotifPanel.value) {
    await fetchPanelNotifications()
  }
}

async function fetchPanelNotifications() {
  try {
    const res = await api.get('/notifications', { params: { pageSize: 10 } })
    panelNotifications.value = res.data.notifications || []
  } catch (err) {
    console.error('Fetch panel notifications error:', err)
  }
}

async function markAllRead() {
  try {
    await api.put('/notifications/read-all')
    panelNotifications.value.forEach(n => n.is_read = 1)
    userStore.fetchUnreadCount()
  } catch (err) {
    console.error('Mark all read error:', err)
  }
}

function handleNotifClick(notif) {
  if (!notif.is_read) {
    api.put(`/notifications/${notif.id}/read`).catch(() => {})
    notif.is_read = 1
    userStore.fetchUnreadCount()
  }
  showNotifPanel.value = false
  if (notif.related_id) {
    router.push(`/posts/${notif.related_id}`)
  } else if (notif.type === 'private_message') {
    router.push('/messages')
  }
}

function closeNotifPanel(e) {
  if (showNotifPanel.value && !e.target.closest('.nav-link-with-badge')) {
    showNotifPanel.value = false
  }
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN')
}

onMounted(() => {
  userStore.initSocket()
  userStore.fetchUnreadCount()
  userStore.onNotification(handleNotification)
  pmStore.fetchUnreadCount()

  const socket = getSocket()
  if (socket) {
    socket.on('private:message', handlePrivateMessage)
  }

  document.addEventListener('click', closeNotifPanel)
})

onUnmounted(() => {
  userStore.offNotification(handleNotification)
  const socket = getSocket()
  if (socket) {
    socket.off('private:message', handlePrivateMessage)
  }
  document.removeEventListener('click', closeNotifPanel)
})
</script>
