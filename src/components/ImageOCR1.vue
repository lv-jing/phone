<template>
  <div class="ocr-container">
    <div class="ocr-card">
      <h1 class="title">图片文字识别</h1>
      <p class="subtitle">上传图片，自动识别其中的所有文字、数字、符号和空格</p>

      <!-- 文件上传区域 -->
      <div 
        class="upload-zone"
        :class="{ 'drag-over': isDragOver }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="selectFile"
      >
        <input 
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileChange"
          style="display: none"
        />
        
        <div v-if="!currentImage" class="upload-placeholder">
          <div class="upload-icon">📁</div>
          <p class="upload-text">点击选择图片或拖拽图片到此处</p>
          <p class="upload-hint">支持 JPG、PNG、GIF、WEBP 等格式</p>
        </div>
        
        <div v-else class="image-container">
          <img :src="currentImage" alt="待识别图片" class="preview-image" />
          <button class="close-btn" @click.stop="clearImage">✕</button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="currentImage" class="button-group">
        <button 
          class="btn btn-primary"
          :disabled="isRecognizing || !workerReady"
          @click="startRecognition"
        >
          <span v-if="!isRecognizing">🔍 开始识别</span>
          <span v-else class="loading-text">
            <span class="spinner"></span>
            {{ recognitionStatus || '识别中...' }} {{ recognitionProgress }}%
          </span>
        </button>
        <button 
          class="btn btn-secondary"
          :disabled="isRecognizing"
          @click="clearImage"
        >
          重新选择
        </button>
      </div>

      <!-- Worker 初始化状态 -->
      <div v-if="!workerReady && !isRecognizing" class="init-status">
        <p>⚙️ 正在初始化 OCR 引擎（首次使用需要下载语言模型）...</p>
        <div class="init-progress">
          <div class="init-progress-bar" :style="{ width: initProgress + '%' }"></div>
        </div>
        <p class="init-hint">{{ initStatus }}</p>
      </div>

      <!-- 识别结果 -->
      <div v-if="resultText || isRecognizing || phoneNumbers.length > 0" class="result-section">
        <!-- 提取到的手机号 -->
        <div v-if="phoneNumbers.length > 0" class="phone-section">
          <div class="result-header">
            <h2>📱 提取到的手机号 ({{ phoneNumbers.length }}个)</h2>
            <div class="result-actions">
              <button class="btn-small btn-copy-phones" @click="copyPhones">📋 复制全部</button>
              <button class="btn-small btn-download-vcf" @click="downloadVCF">📥 导出VCF</button>
            </div>
          </div>
          <div class="phone-list">
            <div 
              v-for="(phone, index) in phoneNumbers" 
              :key="index" 
              class="phone-item"
            >
              <span class="phone-number">{{ phone }}</span>
              <button class="btn-tiny btn-copy-single" @click="copySinglePhone(phone)">复制</button>
            </div>
          </div>
        </div>

        <!-- 完整识别文本 -->
        <div v-if="resultText" class="text-section">
          <div class="result-header">
            <h2>📝 完整识别结果</h2>
            <div class="result-actions">
              <button class="btn-small btn-copy" @click="copyResult">📋 复制</button>
              <button class="btn-small btn-download" @click="downloadResult">💾 下载</button>
            </div>
          </div>
          <div class="result-box">
            <pre class="result-text">{{ resultText }}</pre>
            <div class="result-stats">
              <span>总字符数: {{ resultText.length }}</span>
              <span>总行数: {{ resultText.split('\n').length }}</span>
              <span>非空字符: {{ resultText.replace(/\s/g, '').length }}</span>
            </div>
          </div>
        </div>
        
        <div v-else-if="isRecognizing" class="recognizing-tip">
          <p>正在识别图片中的文字内容...</p>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="errorMsg" class="error-box">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMsg }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { createWorker } from 'tesseract.js'

// 响应式数据
const fileInput = ref(null)
const currentImage = ref('')
const resultText = ref('')
const phoneNumbers = ref([])
const isRecognizing = ref(false)
const recognitionProgress = ref(0)
const isDragOver = ref(false)
const errorMsg = ref('')
const workerReady = ref(false)
const initProgress = ref(0)
const initStatus = ref('准备中...')
const recognitionStatus = ref('')

// Worker 实例
let worker = null

// 选择文件
const selectFile = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    loadImage(file)
  } else {
    showError('请选择有效的图片文件')
  }
}

// 处理拖拽
const handleDrop = (e) => {
  isDragOver.value = false
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) {
    loadImage(file)
  } else {
    showError('请拖拽有效的图片文件')
  }
}

// 加载图片
const loadImage = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    currentImage.value = e.target.result
    resultText.value = ''
    errorMsg.value = ''
  }
  reader.onerror = () => {
    showError('图片加载失败')
  }
  reader.readAsDataURL(file)
}

// 清除图片
const clearImage = () => {
  currentImage.value = ''
  resultText.value = ''
  phoneNumbers.value = []
  errorMsg.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 显示错误
const showError = (msg) => {
  errorMsg.value = msg
  setTimeout(() => {
    errorMsg.value = ''
  }, 5000)
}

// 初始化 Worker - 使用更稳定的方式
const initWorker = async () => {
  if (worker) return worker

  try {
    initStatus.value = '创建 Worker...'
    initProgress.value = 10

    // 使用 createWorker，但不直接传入语言代码
    // 先创建 worker，然后手动加载语言
    worker = await createWorker()

    initStatus.value = 'Worker 创建成功'
    initProgress.value = 20

    // 手动加载语言
    initStatus.value = '加载语言模型...'
    await worker.loadLanguage('chi_sim+eng')
    
    initProgress.value = 50
    
    // 初始化 worker
    initStatus.value = '初始化 Worker...'
    await worker.initialize('chi_sim+eng')
    
    initProgress.value = 80

    // 验证 worker 是否可用
    if (!worker) {
      throw new Error('Worker 创建失败')
    }

    // 等待一下确保完全准备好
    await new Promise(resolve => setTimeout(resolve, 300))

    workerReady.value = true
    initProgress.value = 100
    initStatus.value = '初始化完成，可以开始识别'

    return worker
  } catch (err) {
    console.error('Worker 初始化失败:', err)
    showError('OCR 引擎初始化失败: ' + err.message)
    worker = null
    workerReady.value = false
    throw err
  }
}

// 处理 Worker 日志
const handleWorkerLog = (m) => {
  const status = m.status
  
  if (status === 'loading tesseract core') {
    initProgress.value = 15
    initStatus.value = '加载 Tesseract 核心...'
  } else if (status === 'initializing tesseract') {
    initProgress.value = 25
    initStatus.value = '初始化 Tesseract...'
  } else if (status === 'loading language traineddata') {
    const progress = m.progress || 0
    initProgress.value = 30 + Math.round(progress * 50)
    initStatus.value = `加载语言模型... ${Math.round(progress * 100)}%`
  } else if (status === 'initializing api') {
    initProgress.value = 85
    initStatus.value = '初始化 API...'
  } else if (status === 'recognizing text') {
    // 识别进度
    const progress = m.progress || 0
    recognitionProgress.value = Math.round(progress * 100)
  }
}

// 预处理图片 - 智能处理长图，提高清晰度
const preprocessImage = async (imageDataUrl) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      let { width, height } = img
      const originalWidth = width
      const originalHeight = height
      
      // 判断是否为长图（高度远大于宽度）
      const isLongImage = height > width * 2
      
      // 长图策略：保持高分辨率，限制最大尺寸避免内存溢出
      // 短图策略：如果太小则放大，提高清晰度
      let targetWidth = width
      let targetHeight = height
      
      if (isLongImage) {
        // 长图：先放大以提高清晰度，然后再分割识别
        // 放大倍数：根据原图尺寸智能调整（再次向上微调）
        let scaleRatio = 3.7 // 默认放大3.7倍
        
        // 如果原图很小，可以放大更多
        if (width < 800) {
          scaleRatio = 4.2
        } else if (width < 1200) {
          scaleRatio = 3.7
        } else {
          scaleRatio = 3.4
        }
        
        targetWidth = Math.round(width * scaleRatio)
        targetHeight = Math.round(height * scaleRatio)
        
        // 确保放大后的最小宽度为500px（向上微调）
        const minWidth = 500
        if (targetWidth < minWidth) {
          const minScaleRatio = minWidth / width
          scaleRatio = Math.max(scaleRatio, minScaleRatio)
          targetWidth = Math.round(width * scaleRatio)
          targetHeight = Math.round(height * scaleRatio)
        }
        
        // 限制最大尺寸避免内存溢出（放大后的限制）
        const maxWidth = 4000
        const maxHeight = 20000  // 长图允许非常高的高度（放大后）
        
        // 如果放大后超过限制，按比例缩放
        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
          targetWidth = Math.round(targetWidth * ratio)
          targetHeight = Math.round(targetHeight * ratio)
        }
      } else {
        // 短图：如果太小，放大以提高清晰度
        const minWidth = 1000
        const minHeight = 1000
        
        if (width < minWidth || height < minHeight) {
          const scaleRatio = Math.max(minWidth / width, minHeight / height)
          // 限制最大放大倍数，避免过度放大导致模糊
          const finalRatio = Math.min(scaleRatio, 3)
          targetWidth = Math.round(width * finalRatio)
          targetHeight = Math.round(height * finalRatio)
        }
        
        // 短图也要限制最大尺寸
        const maxWidth = 4000
        const maxHeight = 4000
        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight)
          targetWidth = Math.round(targetWidth * ratio)
          targetHeight = Math.round(targetHeight * ratio)
        }
      }
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      // 高质量渲染设置
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // 使用高质量算法绘制图片
      ctx.drawImage(img, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight)
      
      // 转换为高质量图片
      // 长图使用更高质量
      const quality = isLongImage ? 1.0 : 0.98
      resolve(canvas.toDataURL('image/png', quality))
    }
    img.onerror = () => resolve(imageDataUrl)
    img.src = imageDataUrl
  })
}

// 分割长图为多个片段
const splitLongImage = async (imageDataUrl) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      const isLongImage = height > width * 2
      
      // 如果不是长图，直接返回原图
      if (!isLongImage) {
        resolve([imageDataUrl])
        return
      }
      
      // 长图分割策略：对已放大的高清图片进行分割
      // 每个片段高度为宽度的3.2倍（向下微调，提高识别精度）
      const segmentHeight = Math.min(width * 3, 3000) // 每个片段的高度（向下微调）
      const overlap = Math.round(segmentHeight * 0.15) // 15%重叠避免截断文字
      const step = segmentHeight - overlap // 每次移动的距离
      
      const segments = []
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      canvas.width = width
      canvas.height = segmentHeight
      
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      // 从顶部开始，逐步向下分割
      for (let y = 0; y < height; y += step) {
        const segmentY = Math.max(0, y - overlap) // 向上重叠一点
        const actualHeight = Math.min(segmentHeight, height - segmentY)
        
        if (actualHeight <= 0) break
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // 绘制片段
        ctx.drawImage(
          img,
          0, segmentY, width, actualHeight,
          0, 0, width, actualHeight
        )
        
        // 转换为图片
        const segmentDataUrl = canvas.toDataURL('image/png', 1.0)
        segments.push(segmentDataUrl)
        
        // 如果已经到达底部，退出
        if (segmentY + actualHeight >= height) {
          break
        }
      }
      
      resolve(segments)
    }
    img.onerror = () => resolve([imageDataUrl])
    img.src = imageDataUrl
  })
}

// 开始识别 - 使用最新 API
const startRecognition = async () => {
  if (!currentImage.value) {
    showError('请先上传图片')
    return
  }

  // 确保 Worker 已初始化
  if (!workerReady.value || !worker) {
    try {
      await initWorker()
    } catch (err) {
      return
    }
  }

  isRecognizing.value = true
  recognitionProgress.value = 0
  resultText.value = ''
  errorMsg.value = ''

  try {
    // 确保 worker 存在且可用
    if (!worker) {
      throw new Error('OCR Worker 未初始化')
    }

    // 预处理图片（压缩长图和大图）
    recognitionProgress.value = 5
    const processedImage = await preprocessImage(currentImage.value)
    
    // 检查是否为长图，如果是则分割处理
    const img = new Image()
    img.src = processedImage
    await new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve
    })
    
    const isLongImage = img.height > img.width * 2
    
    let allText = ''
    
    if (isLongImage) {
      // 长图分割识别
      recognitionProgress.value = 10
      const segments = await splitLongImage(processedImage)
      
      recognitionStatus.value = `正在识别长图（共 ${segments.length} 个片段）...`
      
      // 逐个识别每个片段
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        recognitionStatus.value = `正在识别片段 ${i + 1}/${segments.length}...`
        
        // 更新进度：10% + (i / segments.length) * 85%
        recognitionProgress.value = 10 + Math.round((i / segments.length) * 85)
        
        try {
          const result = await worker.recognize(segment)
          const segmentText = result.data.text || ''
          
          // 合并文本，片段之间添加换行分隔
          if (segmentText.trim()) {
            allText += segmentText + '\n\n'
          }
        } catch (err) {
          console.warn(`片段 ${i + 1} 识别失败:`, err)
          // 继续处理下一个片段
        }
      }
      
      recognitionProgress.value = 100
      recognitionStatus.value = '识别完成'
    } else {
      // 短图直接识别
      recognitionProgress.value = 10
      const result = await worker.recognize(processedImage)
      allText = result.data.text || ''
      recognitionProgress.value = 100
    }
    
    if (allText.trim()) {
      resultText.value = allText.trim()
      
      // 自动提取手机号
      const phones = extractPhoneNumbers(allText)
      phoneNumbers.value = phones
    } else {
      showError('未识别到文字内容，请确保图片清晰且包含文字')
      phoneNumbers.value = []
    }
  } catch (err) {
    console.error('识别失败:', err)
    showError('识别失败: ' + (err.message || '未知错误'))
  } finally {
    isRecognizing.value = false
    recognitionProgress.value = 0
  }
}

// 从文本中提取手机号（按顺序）
const extractPhoneNumbers = (text) => {
  if (!text) return []
  
  const phones = new Set()
  const positions = new Map()
  
  // 匹配11位手机号
  const pattern = /1[3-9]\d{9}/g
  let match
  while ((match = pattern.exec(text)) !== null) {
    const phone = match[0]
    if (!phones.has(phone)) {
      phones.add(phone)
      positions.set(phone, match.index)
    }
  }
  
  // 按位置排序
  return Array.from(phones).sort((a, b) => {
    return (positions.get(a) || 0) - (positions.get(b) || 0)
  })
}

// 复制结果
const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(resultText.value)
    const btn = document.querySelector('.btn-copy')
    if (btn) {
      const original = btn.textContent
      btn.textContent = '✓ 已复制'
      setTimeout(() => {
        btn.textContent = original
      }, 2000)
    }
  } catch (err) {
    showError('复制失败，请手动复制')
  }
}

// 下载结果
const downloadResult = () => {
  const blob = new Blob([resultText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `OCR识别结果_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  const btn = document.querySelector('.btn-download')
  if (btn) {
    const original = btn.textContent
    btn.textContent = '✓ 已下载'
    setTimeout(() => {
      btn.textContent = original
    }, 2000)
  }
}

// 复制所有手机号
const copyPhones = async () => {
  try {
    const text = phoneNumbers.value.join('\n')
    await navigator.clipboard.writeText(text)
    const btn = document.querySelector('.btn-copy-phones')
    if (btn) {
      const original = btn.textContent
      btn.textContent = '✓ 已复制'
      setTimeout(() => {
        btn.textContent = original
      }, 2000)
    }
  } catch (err) {
    showError('复制失败，请手动复制')
  }
}

// 复制单个手机号
const copySinglePhone = async (phone) => {
  try {
    await navigator.clipboard.writeText(phone)
    showError('已复制: ' + phone)
    setTimeout(() => {
      errorMsg.value = ''
    }, 2000)
  } catch (err) {
    showError('复制失败')
  }
}

// 生成VCF文件内容（按照识别顺序）
const generateVCF = () => {
  if (phoneNumbers.value.length === 0) {
    showError('没有可导出的手机号')
    return null
  }
  
  let vcfContent = ''
  
  // 按照识别顺序生成VCF（手机号已经按位置排序）
  phoneNumbers.value.forEach((phone, index) => {
    // 移除电话号码中的空格和特殊字符，只保留数字
    const cleanPhone = phone.replace(/\D/g, '')
    
    // 生成联系人名称：手机号 + 序号（如果有重复）
    let contactName = `联系人_${index + 1}`
    
    // 如果手机号重复，添加序号后缀
    const phoneCount = phoneNumbers.value.filter(p => p.replace(/\D/g, '') === cleanPhone).length
    if (phoneCount > 1) {
      const phoneIndex = phoneNumbers.value.slice(0, index + 1).filter(p => p.replace(/\D/g, '') === cleanPhone).length
      contactName = `联系人_${cleanPhone}_${phoneIndex}`
    } else {
      contactName = `联系人_${cleanPhone}`
    }
    
    // VCF格式（vCard 3.0）
    vcfContent += `BEGIN:VCARD
VERSION:3.0
FN:${contactName}
TEL;TYPE=CELL:${cleanPhone}
END:VCARD
`
  })
  
  return vcfContent
}

// 下载VCF文件
const downloadVCF = () => {
  const vcfContent = generateVCF()
  
  if (!vcfContent) {
    return
  }
  
  try {
    // 创建Blob对象
    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8' })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名（包含当前日期时间和数量）
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    link.download = `联系人_${phoneNumbers.value.length}个_${dateStr}_${timeStr}.vcf`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 提示用户
    const btn = document.querySelector('.btn-download-vcf')
    if (btn) {
      const original = btn.textContent
      btn.textContent = '✓ 已导出'
      setTimeout(() => {
        btn.textContent = original
      }, 2000)
    }
    
    showError(`已导出 ${phoneNumbers.value.length} 个联系人到VCF文件`)
    setTimeout(() => {
      errorMsg.value = ''
    }, 3000)
  } catch (err) {
    console.error('下载VCF文件失败:', err)
    showError('下载VCF文件失败: ' + (err.message || '未知错误'))
  }
}

onMounted(() => {
  // 使用直接调用方式，不需要预加载
})

onBeforeUnmount(() => {
  // 使用直接调用方式，不需要手动销毁 worker
})
</script>

<style scoped>
.ocr-container {
  min-height: 100vh;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.ocr-card {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 0.5rem 0;
  text-align: center;
}

.subtitle {
  text-align: center;
  color: #666;
  margin: 0 0 2rem 0;
  font-size: 1rem;
}

.upload-zone {
  border: 3px dashed #ddd;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.upload-zone:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-zone.drag-over {
  border-color: #667eea;
  background: #e8edff;
  transform: scale(1.01);
}

.upload-placeholder {
  color: #666;
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0.5rem 0;
  color: #333;
}

.upload-hint {
  font-size: 0.9rem;
  color: #999;
  margin: 0.5rem 0 0 0;
}

.image-container {
  position: relative;
  max-width: 100%;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.close-btn {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #ff4444;
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
}

.close-btn:hover {
  transform: scale(1.1);
}

.button-group {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}

.btn {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.loading-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.init-status {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: #e3f2fd;
  border-radius: 8px;
  text-align: center;
}

.init-status p {
  margin: 0.5rem 0;
  color: #1976d2;
  font-weight: 500;
}

.init-progress {
  width: 100%;
  height: 6px;
  background: #bbdefb;
  border-radius: 3px;
  overflow: hidden;
  margin: 1rem 0;
}

.init-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #2196f3, #1976d2);
  transition: width 0.3s;
}

.init-hint {
  font-size: 0.875rem;
  color: #666;
  font-style: italic;
  margin-top: 0.5rem;
}

.result-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 2px solid #eee;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.result-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1a1a1a;
}

.result-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy {
  background: #4caf50;
  color: white;
}

.btn-copy:hover {
  background: #45a049;
}

.btn-download {
  background: #2196f3;
  color: white;
}

.btn-download:hover {
  background: #1976d2;
}

.result-box {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
}

.result-text {
  width: 100%;
  min-height: 300px;
  max-height: 600px;
  overflow-y: auto;
  padding: 1rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Courier New', 'Consolas', monospace;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0 0 1rem 0;
  color: #333;
}

.result-stats {
  display: flex;
  gap: 1.5rem;
  font-size: 0.875rem;
  color: #666;
  flex-wrap: wrap;
}

.recognizing-tip {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error-box {
  margin-top: 1.5rem;
  padding: 1rem 1.5rem;
  background: #ffebee;
  border-left: 4px solid #f44336;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  font-size: 1.25rem;
}

.error-text {
  color: #c62828;
  font-weight: 500;
}

.phone-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #eee;
}

.phone-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.phone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
  transition: all 0.2s;
}

.phone-item:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.phone-number {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a1a;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
}

.btn-tiny {
  padding: 0.4rem 0.8rem;
  font-size: 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-single {
  background: #4caf50;
  color: white;
}

.btn-copy-single:hover {
  background: #45a049;
}

.btn-copy-phones {
  background: #ff9800;
  color: white;
}

.btn-copy-phones:hover {
  background: #f57c00;
}

.btn-download-vcf {
  background: #9c27b0;
  color: white;
}

.btn-download-vcf:hover {
  background: #7b1fa2;
}

.text-section {
  margin-top: 2rem;
}

@media (max-width: 768px) {
  .ocr-card {
    padding: 1.5rem;
  }

  .title {
    font-size: 1.5rem;
  }

  .upload-zone {
    padding: 2rem 1rem;
    min-height: 200px;
  }

  .button-group {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
