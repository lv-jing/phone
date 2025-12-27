<template>
  <div class="app">
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

</style>

