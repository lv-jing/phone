<template>
  <div class="app">
    <header>
      <h1>📸 图片文字提取工具</h1>
      <p class="subtitle">上传图片，快速提取其中的文字内容，并自动识别手机号码</p>
    </header>
    <main>
      <ImageOCR />
    </main>
  </div>
</template>

<script setup>
import ImageOCR from './components/ImageOCR.vue'
</script>

<style scoped>
.app {
  min-height: 100vh;
  padding: 2rem 1rem;
}

header {
  text-align: center;
  padding: 2rem 0;
  margin-bottom: 2rem;
}

h1 {
  font-size: 2.5rem;
  line-height: 1.2;
  color: #213547;
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 1.1rem;
  color: #666;
  margin: 0;
}

main {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}
</style>

