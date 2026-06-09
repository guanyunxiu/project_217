<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>用户登录</h2>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名" @keyup.enter="handleLogin" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="handleLogin" />
      </div>
      <button class="btn btn-primary" @click="handleLogin" :disabled="loading">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <div class="alt-link">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    await userStore.login(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
