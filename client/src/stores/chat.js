import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api'
import { getSocket } from '../utils/socket'

export const useChatStore = defineStore('chat', () => {
  const currentRoom = ref('global')
  const messages = ref({})
  const onlineUsers = ref([])
  const hasMore = ref({})
  const loadingHistory = ref(false)
  const boards = ref([])
  const joinedRooms = ref(new Set())

  const currentMessages = computed(() => messages.value[currentRoom.value] || [])
  const currentHasMore = computed(() => hasMore.value[currentRoom.value] !== false)

  function setupListeners() {
    const socket = getSocket()
    if (!socket) return

    socket.off('chat:message')
    socket.off('chat:user_online')
    socket.off('chat:user_offline')

    socket.on('chat:message', (msg) => {
      const room = msg.room
      if (!messages.value[room]) {
        messages.value[room] = []
      }
      messages.value[room].push(msg)
    })

    socket.on('chat:user_online', (user) => {
      if (!onlineUsers.value.find(u => u.id === user.id)) {
        onlineUsers.value.push(user)
      }
    })

    socket.on('chat:user_offline', (user) => {
      onlineUsers.value = onlineUsers.value.filter(u => u.id !== user.id)
    })
  }

  function joinRoom(room) {
    const socket = getSocket()
    if (!socket) return

    socket.emit('chat:join', room)
    joinedRooms.value.add(room)
    currentRoom.value = room

    if (!messages.value[room]) {
      messages.value[room] = []
      fetchHistory(room)
    }
  }

  function joinAllRooms() {
    const socket = getSocket()
    if (!socket) return

    const rooms = ['global', ...boards.value.map(b => 'board_' + b.id)]
    for (const room of rooms) {
      if (!joinedRooms.value.has(room)) {
        socket.emit('chat:join', room)
        joinedRooms.value.add(room)
        if (!messages.value[room]) {
          messages.value[room] = []
          fetchHistory(room)
        }
      }
    }
  }

  function switchRoom(room) {
    currentRoom.value = room
    if (!joinedRooms.value.has(room)) {
      joinRoom(room)
    }
  }

  async function fetchHistory(room, before) {
    if (loadingHistory.value) return
    loadingHistory.value = true

    try {
      const params = { room }
      if (before) {
        params.before = before
      }
      const res = await api.get('/chat/history', { params })
      const fetched = res.data.messages || []

      if (!messages.value[room]) {
        messages.value[room] = []
      }

      if (before) {
        messages.value[room] = [...fetched, ...messages.value[room]]
      } else {
        messages.value[room] = fetched
      }

      hasMore.value[room] = res.data.hasMore
    } catch (err) {
      console.error('Fetch chat history error:', err)
    } finally {
      loadingHistory.value = false
    }
  }

  function loadOlderMessages() {
    const room = currentRoom.value
    const msgs = messages.value[room]
    if (!msgs || msgs.length === 0) return
    if (!currentHasMore.value) return
    fetchHistory(room, msgs[0].id)
  }

  function sendMessage(content, type = 'text') {
    const socket = getSocket()
    if (!socket) return

    socket.emit('chat:message', {
      room: currentRoom.value,
      content,
      type
    })
  }

  async function fetchOnlineUsers() {
    try {
      const res = await api.get('/chat/online')
      onlineUsers.value = res.data.users || []
    } catch (err) {
      console.error('Fetch online users error:', err)
    }
  }

  async function fetchBoards() {
    try {
      const res = await api.get('/boards')
      boards.value = res.data || []
    } catch (err) {
      console.error('Fetch boards error:', err)
    }
  }

  function cleanup() {
    const socket = getSocket()
    if (socket) {
      for (const room of joinedRooms.value) {
        socket.emit('chat:leave', room)
      }
      socket.off('chat:message')
      socket.off('chat:user_online')
      socket.off('chat:user_offline')
    }
    messages.value = {}
    onlineUsers.value = []
    currentRoom.value = 'global'
    joinedRooms.value = new Set()
  }

  return {
    currentRoom, messages, onlineUsers, hasMore, loadingHistory, boards, joinedRooms,
    currentMessages, currentHasMore,
    setupListeners, joinRoom, joinAllRooms, switchRoom, fetchHistory, loadOlderMessages,
    sendMessage, fetchOnlineUsers, fetchBoards, cleanup
  }
})
