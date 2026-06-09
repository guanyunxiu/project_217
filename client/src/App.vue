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
            <router-link to="/notifications">
              通知
              <span v-if="userStore.unreadCount > 0" class="badge">{{ userStore.unreadCount }}</span>
            </router-link>
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
import { onMounted, onUnmounted } from 'vue'
import { useUserStore } from './stores/user'

const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  window.location.href = '/login'
}

function handleNotification() {
  userStore.fetchUnreadCount()
}

onMounted(() => {
  userStore.initSocket()
  userStore.fetchUnreadCount()
  userStore.onNotification(handleNotification)
})

onUnmounted(() => {
  userStore.offNotification(handleNotification)
})
</script>
