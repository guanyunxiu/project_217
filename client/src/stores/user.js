import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'
import { connectSocket, disconnectSocket, getSocket } from '../utils/socket'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const unreadCount = ref(0)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function register(username, password) {
    const res = await api.post('/auth/register', { username, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    connectSocket(res.data.token)
    return res.data
  }

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    connectSocket(res.data.token)
    return res.data
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    disconnectSocket()
  }

  function initSocket() {
    if (token.value) {
      connectSocket(token.value)
    }
  }

  function onNotification(callback) {
    const s = getSocket()
    if (s) {
      s.on('notification', callback)
    }
  }

  function offNotification(callback) {
    const s = getSocket()
    if (s) {
      s.off('notification', callback)
    }
  }

  async function fetchUnreadCount() {
    if (!isLoggedIn.value) return
    try {
      const res = await api.get('/notifications', { params: { pageSize: 1 } })
      unreadCount.value = res.data.unreadCount || 0
    } catch (e) {
      // ignore
    }
  }

  return {
    token, user, unreadCount,
    isLoggedIn, isAdmin,
    register, login, logout, initSocket,
    onNotification, offNotification, fetchUnreadCount
  }
})
