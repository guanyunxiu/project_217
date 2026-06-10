<template>
  <div class="chat-container">
    <div class="chat-sidebar">
      <div class="chat-sidebar-section">
        <h3>聊天室</h3>
        <div
          class="chat-room-item"
          :class="{ active: chatStore.currentRoom === 'global' }"
          @click="switchRoom('global')"
        >
          <span class="chat-room-icon">🌐</span>
          <span>全局聊天</span>
          <span class="chat-room-count">{{ chatStore.onlineUsers.length }}</span>
        </div>
        <div
          v-for="board in chatStore.boards"
          :key="'board_' + board.id"
          class="chat-room-item"
          :class="{ active: chatStore.currentRoom === 'board_' + board.id }"
          @click="switchRoom('board_' + board.id)"
        >
          <span class="chat-room-icon">💬</span>
          <span>{{ board.name }}</span>
        </div>
      </div>

      <div class="chat-sidebar-section">
        <h3>在线用户 ({{ chatStore.onlineUsers.length }})</h3>
        <div v-if="chatStore.onlineUsers.length === 0" class="chat-empty-hint">暂无在线用户</div>
        <div v-for="user in chatStore.onlineUsers" :key="user.id" class="chat-online-user">
          <span class="chat-online-dot"></span>
          <span>{{ user.username }}</span>
        </div>
      </div>
    </div>

    <div class="chat-main">
      <div class="chat-header">
        <h3>{{ roomDisplayName }}</h3>
      </div>

      <div ref="messageList" class="chat-messages" @scroll="handleScroll">
        <div v-if="chatStore.loadingHistory" class="chat-loading">加载中...</div>
        <div v-if="chatStore.currentHasMore && !chatStore.loadingHistory" class="chat-load-more" @click="chatStore.loadOlderMessages()">
          加载更多消息
        </div>
        <div v-if="chatStore.currentMessages.length === 0" class="chat-empty-hint">暂无消息，快来发第一条吧！</div>
        <div
          v-for="msg in chatStore.currentMessages"
          :key="msg.id"
          class="chat-message"
          :class="{ 'chat-message-self': msg.userId === userStore.user?.id }"
        >
          <div class="chat-message-header">
            <span class="chat-message-username">{{ msg.username }}</span>
            <span class="chat-message-time">{{ formatTime(msg.createdAt) }}</span>
          </div>
          <div class="chat-message-content markdown-body" v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>

      <div class="chat-input-area">
        <div v-if="showEmojiPicker" class="emoji-picker">
          <div v-for="category in emojiCategories" :key="category.name" class="emoji-category">
            <div class="emoji-category-title">{{ category.name }}</div>
            <div class="emoji-grid">
              <button
                v-for="emoji in category.emojis"
                :key="emoji"
                class="emoji-btn"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
          </div>
        </div>
        <div class="chat-input-row">
          <button class="chat-emoji-toggle" @click="showEmojiPicker = !showEmojiPicker">😊</button>
          <input
            ref="inputRef"
            v-model="inputText"
            class="chat-input"
            placeholder="输入消息..."
            @keydown.enter="handleSend"
          />
          <button class="chat-send-btn" @click="handleSend" :disabled="!inputText.trim()">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useChatStore } from '../stores/chat'
import { renderMarkdown } from '../utils/markdown'

const userStore = useUserStore()
const chatStore = useChatStore()

const inputText = ref('')
const showEmojiPicker = ref(false)
const messageList = ref(null)
const inputRef = ref(null)

const emojiCategories = [
  {
    name: '表情',
    emojis: ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','😗','😙','😚','🙂','🤗','🤩','🤔','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😜','😝','😛','🤑','😲','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','😳','🤪','😵','😡','😠','🤬']
  },
  {
    name: '手势',
    emojis: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👋','🤚','🖐️','✋','🖖','👏','🙌','🤝','🙏','💪','🤛','🤜','🖕','✍️']
  },
  {
    name: '动物',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦄','🐝','🐛','🦋','🐌','🐞','🐙','🐠','🐬','🐳','🦀','🐢','🦎','🐍','🦕','🦖']
  },
  {
    name: '食物',
    emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍔','🍟','🍕','🌭','🥪','🌮','🍜','🍣','🍦','🍩','🍪','🎂','🍰','🧋','☕','🍺','🥂','🍷']
  },
  {
    name: '其他',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','⭐','🌟','✨','⚡','🔥','💯','🎉','🎊','🏆','🥇','🎵','🎶','🎸','🎮','💻','📱','💡','📌','✅','❌','⚠️','🔔','🎵','💎','🌈','☀️','🌙','⛅']
  }
]

const roomDisplayName = computed(() => {
  if (chatStore.currentRoom === 'global') return '全局聊天'
  const board = chatStore.boards.find(b => 'board_' + b.id === chatStore.currentRoom)
  return board ? board.name + ' 聊天室' : '聊天室'
})

function switchRoom(room) {
  chatStore.switchRoom(room)
  showEmojiPicker.value = false
  nextTick(() => {
    scrollToBottom()
  })
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  chatStore.sendMessage(text)
  inputText.value = ''
  showEmojiPicker.value = false
  nextTick(() => {
    scrollToBottom()
  })
}

function insertEmoji(emoji) {
  inputText.value += emoji
  inputRef.value?.focus()
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function scrollToBottom() {
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

function handleScroll() {
  if (!messageList.value) return
  if (messageList.value.scrollTop < 50) {
    chatStore.loadOlderMessages()
  }
}

watch(() => chatStore.currentMessages.length, () => {
  const list = messageList.value
  if (!list) return
  const wasAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100
  if (wasAtBottom) {
    nextTick(scrollToBottom)
  }
})

onMounted(async () => {
  chatStore.setupListeners()
  await chatStore.fetchOnlineUsers()
  await chatStore.fetchBoards()
  chatStore.joinAllRooms()
  nextTick(scrollToBottom)
})

onUnmounted(() => {
  chatStore.cleanup()
})
</script>
