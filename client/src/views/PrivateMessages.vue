<template>
  <div class="pm-container">
    <div class="pm-sidebar">
      <div class="pm-sidebar-header">
        <h3>私信</h3>
        <span v-if="pmStore.totalUnread > 0" class="pm-unread-badge">{{ pmStore.totalUnread }}</span>
      </div>
      <div class="pm-new-conv-area" style="position:relative;">
        <input
          v-model="searchQuery"
          class="pm-search-input"
          placeholder="搜索用户发起私信..."
          @input="handleSearch"
          @focus="showSearchResults = true"
        />
        <div v-if="showSearchResults && (pmStore.searchResults.length > 0 || searchQuery)" class="pm-search-results">
          <div v-if="pmStore.searchLoading" class="pm-search-result-item" style="color:#999;">搜索中...</div>
          <div v-else-if="pmStore.searchResults.length === 0 && searchQuery" class="pm-search-result-item" style="color:#999;">未找到用户</div>
          <div
            v-for="user in pmStore.searchResults"
            :key="user.id"
            class="pm-search-result-item"
            @click="startConversation(user)"
          >
            {{ user.username }}
          </div>
        </div>
      </div>
      <div v-if="pmStore.conversations.length === 0" class="pm-empty">暂无私信会话</div>
      <div
        v-for="conv in pmStore.conversations"
        :key="conv.other_user_id"
        class="pm-conv-item"
        :class="{ active: pmStore.currentOtherUser?.id === conv.other_user_id }"
        @click="pmStore.openConversation(conv.other_user_id)"
      >
        <div class="pm-conv-info">
          <div class="pm-conv-name">{{ conv.other_username }}</div>
          <div class="pm-conv-preview">{{ conv.content.substring(0, 30) }}{{ conv.content.length > 30 ? '...' : '' }}</div>
        </div>
        <div class="pm-conv-meta">
          <div class="pm-conv-time">{{ formatTime(conv.created_at) }}</div>
          <div v-if="conv.is_read === 0 && conv.receiver_id === currentUserId" class="pm-conv-dot"></div>
        </div>
      </div>
    </div>

    <div class="pm-main">
      <template v-if="pmStore.currentOtherUser">
        <div class="pm-header">
          <button class="pm-back-btn" @click="pmStore.closeConversation">←</button>
          <h3>{{ pmStore.currentOtherUser.username }}</h3>
          <span v-if="pmStore.isOtherOnline" class="pm-online-status">
            <span class="pm-online-dot"></span>在线
          </span>
          <span v-else class="pm-online-status">
            <span class="pm-offline-dot"></span>离线
          </span>
        </div>

        <div ref="messageList" class="pm-messages" @scroll="handleScroll">
          <div v-if="pmStore.loading" class="pm-loading">加载中...</div>
          <div v-if="pmStore.hasMore && !pmStore.loading" class="pm-load-more" @click="pmStore.loadOlderMessages()">加载更多</div>
          <div v-if="pmStore.currentMessages.length === 0 && !pmStore.loading" class="pm-empty">暂无消息，发第一条吧！</div>
          <div
            v-for="msg in pmStore.currentMessages"
            :key="msg.id"
            class="pm-message"
            :class="{ 'pm-message-self': msg.sender_id === currentUserId }"
          >
            <div class="pm-message-header">
              <span class="pm-message-name">{{ msg.sender_username }}</span>
              <span class="pm-message-time">{{ formatTime(msg.created_at) }}</span>
            </div>
            <div class="pm-message-content markdown-body" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>

        <div v-if="pmStore.isOtherTyping" class="pm-typing-indicator">
          {{ pmStore.currentOtherUser.username }} 正在输入...
        </div>

        <div class="pm-input-area">
          <div v-if="showEmojiPicker" class="pm-emoji-picker">
            <div class="pm-emoji-grid">
              <button
                v-for="emoji in quickEmojis"
                :key="emoji"
                class="pm-emoji-btn"
                @click="insertEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;width:100%;">
            <button class="pm-emoji-toggle" @click="showEmojiPicker = !showEmojiPicker">😊</button>
            <input
              ref="inputRef"
              v-model="inputText"
              class="pm-input"
              placeholder="输入私信，支持 Markdown..."
              @keydown.enter="handleSend"
              @input="handleTyping"
            />
            <button class="pm-send-btn" @click="handleSend" :disabled="!inputText.trim()">发送</button>
          </div>
        </div>
      </template>

      <div v-else class="pm-empty-main">
        <div class="pm-empty-icon">💬</div>
        <p>选择一个会话或搜索用户开始聊天</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { usePrivateMessageStore } from '../stores/privateMessage'
import { renderMarkdown } from '../utils/markdown'

const userStore = useUserStore()
const pmStore = usePrivateMessageStore()

const inputText = ref('')
const messageList = ref(null)
const inputRef = ref(null)
const showEmojiPicker = ref(false)
const searchQuery = ref('')
const showSearchResults = ref(false)

const currentUserId = computed(() => userStore.user?.id)

const quickEmojis = ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤔','😅','👍','👎','👌','❤️','🔥','🎉','💯','🙏','💪','👋','😘','🤗','😏','🥺','😢','😡','🤯','😱','😴','🤮']

let typingDebounce = null
let searchDebounce = null

function handleTyping() {
  if (!pmStore.currentOtherUser) return
  if (typingDebounce) return
  pmStore.emitTyping(pmStore.currentOtherUser.id)
  typingDebounce = setTimeout(() => {
    typingDebounce = null
  }, 2000)
}

function handleSearch() {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    pmStore.searchUsers(searchQuery.value)
    showSearchResults.value = true
  }, 300)
}

function startConversation(user) {
  searchQuery.value = ''
  showSearchResults.value = false
  pmStore.searchResults = []
  pmStore.openConversation(user.id)
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  pmStore.sendMessage(text)
  inputText.value = ''
  showEmojiPicker.value = false
  nextTick(scrollToBottom)
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
    pmStore.loadOlderMessages()
  }
}

function closeSearchResults(e) {
  if (showSearchResults.value && !e.target.closest('.pm-new-conv-area')) {
    showSearchResults.value = false
  }
}

watch(() => pmStore.currentMessages.length, () => {
  const list = messageList.value
  if (!list) return
  const wasAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 100
  if (wasAtBottom) {
    nextTick(scrollToBottom)
  }
})

onMounted(async () => {
  pmStore.setupListeners()
  await pmStore.fetchConversations()
  document.addEventListener('click', closeSearchResults)
})

onUnmounted(() => {
  pmStore.cleanup()
  document.removeEventListener('click', closeSearchResults)
  if (typingDebounce) clearTimeout(typingDebounce)
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>
