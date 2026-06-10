import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../utils/api'
import { getSocket } from '../utils/socket'

export const usePrivateMessageStore = defineStore('privateMessage', () => {
  const conversations = ref([])
  const currentMessages = ref([])
  const currentOtherUser = ref(null)
  const totalUnread = ref(0)
  const hasMore = ref(true)
  const loading = ref(false)
  const isOtherTyping = ref(false)
  const isOtherOnline = ref(false)
  const searchResults = ref([])
  const searchLoading = ref(false)

  let typingTimeout = null

  function setupListeners() {
    const socket = getSocket()
    if (!socket) return

    socket.off('private:message')
    socket.off('private:typing')
    socket.off('chat:user_online')
    socket.off('chat:user_offline')

    socket.on('private:message', (msg) => {
      const myId = JSON.parse(localStorage.getItem('user') || '{}').id
      const otherId = currentOtherUser.value?.id
      const isCurrentConv = otherId && (
        (msg.sender_id === otherId && msg.receiver_id === myId) ||
        (msg.sender_id === myId && msg.receiver_id === otherId)
      )
      if (isCurrentConv) {
        currentMessages.value.push(msg)
      }
      isOtherTyping.value = false
      fetchConversations()
      fetchUnreadCount()
    })

    socket.on('private:typing', (data) => {
      if (currentOtherUser.value?.id === data.sender_id) {
        isOtherTyping.value = true
        if (typingTimeout) clearTimeout(typingTimeout)
        typingTimeout = setTimeout(() => {
          isOtherTyping.value = false
        }, 3000)
      }
    })

    socket.on('chat:user_online', (user) => {
      if (currentOtherUser.value?.id === user.id) {
        isOtherOnline.value = true
      }
    })

    socket.on('chat:user_offline', (user) => {
      if (currentOtherUser.value?.id === user.id) {
        isOtherOnline.value = false
      }
    })
  }

  function emitTyping(receiverId) {
    const socket = getSocket()
    if (socket) {
      socket.emit('private:typing', { receiver_id: receiverId })
    }
  }

  async function searchUsers(query) {
    if (!query || query.trim().length === 0) {
      searchResults.value = []
      return
    }
    searchLoading.value = true
    try {
      const res = await api.get('/auth/users/search', { params: { q: query } })
      const myId = JSON.parse(localStorage.getItem('user') || '{}').id
      searchResults.value = (res.data.users || []).filter(u => u.id !== myId)
    } catch (err) {
      console.error('Search users error:', err)
    } finally {
      searchLoading.value = false
    }
  }

  async function fetchConversations() {
    try {
      const res = await api.get('/private-messages/conversations')
      conversations.value = res.data.conversations || []
      totalUnread.value = res.data.totalUnread || 0
    } catch (err) {
      console.error('Fetch conversations error:', err)
    }
  }

  async function fetchUnreadCount() {
    try {
      const res = await api.get('/private-messages/unread-count')
      totalUnread.value = res.data.unreadCount || 0
    } catch (err) {
      console.error('Fetch unread count error:', err)
    }
  }

  async function fetchMessages(userId, before) {
    if (loading.value) return
    loading.value = true

    try {
      const params = {}
      if (before) params.before = before
      const res = await api.get(`/private-messages/${userId}`, { params })
      const fetched = res.data.messages || []

      if (before) {
        currentMessages.value = [...fetched, ...currentMessages.value]
      } else {
        currentMessages.value = fetched
      }
      hasMore.value = res.data.hasMore
    } catch (err) {
      console.error('Fetch messages error:', err)
    } finally {
      loading.value = false
    }
  }

  async function openConversation(userId) {
    currentOtherUser.value = { id: userId }
    currentMessages.value = []
    hasMore.value = true
    isOtherTyping.value = false

    try {
      const [msgRes, userRes] = await Promise.all([
        api.get(`/private-messages/${userId}`),
        api.get(`/auth/users/${userId}`)
      ])
      currentMessages.value = msgRes.data.messages || []
      hasMore.value = msgRes.data.hasMore
      if (userRes.data) {
        currentOtherUser.value = { id: userId, username: userRes.data.username }
      }
      fetchConversations()
      checkOnlineStatus(userId)
    } catch (err) {
      console.error('Open conversation error:', err)
    }
  }

  async function checkOnlineStatus(userId) {
    try {
      const res = await api.get('/chat/online')
      const onlineUsers = res.data.users || []
      isOtherOnline.value = onlineUsers.some(u => u.id === userId)
    } catch {
      isOtherOnline.value = false
    }
  }

  async function sendMessage(content) {
    if (!currentOtherUser.value || !content.trim()) return

    const socket = getSocket()
    if (socket) {
      socket.emit('private:message', {
        receiver_id: currentOtherUser.value.id,
        content: content.trim()
      })
    }
  }

  function loadOlderMessages() {
    if (!currentOtherUser.value || currentMessages.value.length === 0) return
    if (!hasMore.value) return
    fetchMessages(currentOtherUser.value.id, currentMessages.value[0].id)
  }

  function closeConversation() {
    currentOtherUser.value = null
    currentMessages.value = []
    isOtherTyping.value = false
  }

  function cleanup() {
    const socket = getSocket()
    if (socket) {
      socket.off('private:message')
      socket.off('private:typing')
    }
    conversations.value = []
    currentMessages.value = []
    currentOtherUser.value = null
    totalUnread.value = 0
    isOtherTyping.value = false
    isOtherOnline.value = false
    searchResults.value = []
    if (typingTimeout) clearTimeout(typingTimeout)
  }

  return {
    conversations, currentMessages, currentOtherUser, totalUnread, hasMore, loading,
    isOtherTyping, isOtherOnline, searchResults, searchLoading,
    setupListeners, searchUsers, emitTyping, fetchConversations, fetchUnreadCount, fetchMessages,
    openConversation, sendMessage, loadOlderMessages, closeConversation, cleanup
  }
})
