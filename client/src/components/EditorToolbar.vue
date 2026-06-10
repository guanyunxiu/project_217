<template>
  <div class="editor-toolbar">
    <button class="editor-toolbar-btn" title="加粗" @click="insert('**', '**')">
      <strong>B</strong>
    </button>
    <button class="editor-toolbar-btn" title="斜体" @click="insert('*', '*')">
      <em>I</em>
    </button>
    <button class="editor-toolbar-btn" title="删除线" @click="insert('~~', '~~')">
      <s>S</s>
    </button>
    <button class="editor-toolbar-btn" title="上标" @click="insert('^', '^')">
      X<sup>2</sup>
    </button>
    <button class="editor-toolbar-btn" title="下标" @click="insert('~', '~')">
      X<sub>2</sub>
    </button>
    <span class="editor-toolbar-divider"></span>
    <button class="editor-toolbar-btn" title="一级标题" @click="insertLine('# ')">H1</button>
    <button class="editor-toolbar-btn" title="二级标题" @click="insertLine('## ')">H2</button>
    <button class="editor-toolbar-btn" title="三级标题" @click="insertLine('### ')">H3</button>
    <span class="editor-toolbar-divider"></span>
    <button class="editor-toolbar-btn" title="引用" @click="insertLine('> ')">
      <span style="font-size:16px;">❝</span>
    </button>
    <button class="editor-toolbar-btn" title="行内代码" @click="insert('`', '`')">
      &lt;/&gt;
    </button>
    <button class="editor-toolbar-btn" title="代码块" @click="insertCodeBlock()">
      { }
    </button>
    <span class="editor-toolbar-divider"></span>
    <button class="editor-toolbar-btn" title="无序列表" @click="insertLine('- ')">• 列表</button>
    <button class="editor-toolbar-btn" title="有序列表" @click="insertLine('1. ')">1. 列表</button>
    <button class="editor-toolbar-btn" title="任务列表" @click="insertLine('- [ ] ')">☑ 任务</button>
    <span class="editor-toolbar-divider"></span>
    <button class="editor-toolbar-btn" title="链接" @click="insertLink()">🔗</button>
    <button class="editor-toolbar-btn" title="图片" @click="insertImage()">🖼</button>
    <button class="editor-toolbar-btn" title="表格" @click="insertTable()">📊</button>
    <button class="editor-toolbar-btn" title="分割线" @click="insertLine('---\n')">—</button>
    <span class="editor-toolbar-divider"></span>
    <div class="editor-toolbar-color">
      <button class="editor-toolbar-btn" title="文字颜色" @click.stop="showColorPicker = !showColorPicker">🎨</button>
      <div v-if="showColorPicker" class="color-picker-popup" @click.stop>
        <div
          v-for="color in colors"
          :key="color.value"
          class="color-swatch"
          :style="{ background: color.value }"
          :title="color.name"
          @click="applyColor(color.value)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const showColorPicker = ref(false)

const colors = [
  { name: '红色', value: '#e74c3c' },
  { name: '橙色', value: '#e67e22' },
  { name: '黄色', value: '#f1c40f' },
  { name: '绿色', value: '#27ae60' },
  { name: '青色', value: '#1abc9c' },
  { name: '蓝色', value: '#2980b9' },
  { name: '紫色', value: '#8e44ad' },
  { name: '粉色', value: '#e91e8b' },
  { name: '灰色', value: '#7f8c8d' },
  { name: '黑色', value: '#2c3e50' }
]

function getActiveTextarea() {
  const el = document.activeElement
  if (el && el.tagName === 'TEXTAREA') return el
  const textareas = document.querySelectorAll('textarea')
  for (const ta of textareas) {
    if (ta.closest('.form-group') || ta.closest('.editor-with-preview') || ta.closest('.pm-input-area') || ta.closest('.chat-input-area')) {
      return ta
    }
  }
  return null
}

function insert(before, after) {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.substring(start, end)
  const replacement = before + (selected || '文本') + after
  const newValue = props.modelValue.substring(0, start) + replacement + props.modelValue.substring(end)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    const cursorPos = selected ? start + replacement.length : start + before.length
    const selectEnd = selected ? cursorPos : cursorPos + 2
    textarea.setSelectionRange(cursorPos, selectEnd)
  })
}

function insertLine(prefix) {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const value = props.modelValue
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(start + prefix.length, start + prefix.length)
  })
}

function insertCodeBlock() {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.substring(start, end)
  const replacement = '\n```javascript\n' + (selected || '代码') + '\n```\n'
  const newValue = props.modelValue.substring(0, start) + replacement + props.modelValue.substring(end)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    const codeStart = start + 14
    textarea.setSelectionRange(codeStart, codeStart + (selected ? selected.length : 2))
  })
}

function insertLink() {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.substring(start, end)
  const replacement = '[' + (selected || '链接文本') + '](url)'
  const newValue = props.modelValue.substring(0, start) + replacement + props.modelValue.substring(end)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    if (!selected) {
      textarea.setSelectionRange(start + 1, start + 5)
    } else {
      const urlStart = start + selected.length + 3
      textarea.setSelectionRange(urlStart, urlStart + 3)
    }
  })
}

function insertImage() {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const replacement = '![图片描述](url)'
  const newValue = props.modelValue.substring(0, start) + replacement + props.modelValue.substring(start)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    textarea.setSelectionRange(start + 2, start + 6)
  })
}

function insertTable() {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const table = '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
  const newValue = props.modelValue.substring(0, start) + table + props.modelValue.substring(start)
  emit('update:modelValue', newValue)

  requestAnimationFrame(() => {
    textarea.focus()
    const cursorPos = start + 3
    textarea.setSelectionRange(cursorPos, cursorPos + 2)
  })
}

function applyColor(color) {
  const textarea = getActiveTextarea()
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = props.modelValue.substring(start, end)
  const text = selected || '彩色文字'
  const replacement = `<span style="color:${color}">${text}</span>`
  const newValue = props.modelValue.substring(0, start) + replacement + props.modelValue.substring(end)
  emit('update:modelValue', newValue)
  showColorPicker.value = false

  requestAnimationFrame(() => {
    textarea.focus()
    if (selected) {
      textarea.setSelectionRange(start, start + replacement.length)
    } else {
      const textStart = replacement.indexOf(text)
      textarea.setSelectionRange(start + textStart, start + textStart + text.length)
    }
  })
}

function closeColorPicker(e) {
  if (showColorPicker.value && !e.target.closest('.editor-toolbar-color')) {
    showColorPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', closeColorPicker)
})

onUnmounted(() => {
  document.removeEventListener('click', closeColorPicker)
})
</script>
