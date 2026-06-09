<template>
  <div class="auth-page">
    <div class="auth-card">
      <h2>用户注册</h2>
      <div v-if="error" class="error-message">{{ error }}</div>
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="3-50个字符" @keyup.enter="handleRegister" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="至少6位" @keyup.enter="handleRegister" />
      </div>
      <div class="form-group">
        <label>确认密码</label>
        <input v-model="confirmPassword" type="password" placeholder="再次输入密码" @keyup.enter="handleRegister" />
      </div>
      <button class="btn btn-primary" @click="handleRegister" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </button>
      <div class="alt-link">
        已有账号？<router-link to="/login">立即登录</router-link>
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
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次密码输入不一致'
    return
  }
  loading.value = true
  try {
    await userStore.register(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>
