<template>
  <div class="image-ocr">
    <div class="container">
      <h2>📞 图片手机号提取工具</h2>
      
      <!-- 上传区域 -->
      <div class="upload-area" 
           @drop.prevent="handleDrop"
           @dragover.prevent="isDragging = true"
           @dragleave.prevent="isDragging = false"
           :class="{ 'dragging': isDragging }"
           @click="triggerFileInput">
        <input 
          ref="fileInput"
          type="file" 
          accept="image/*" 
          @change="handleFileSelect"
          style="display: none"
        />
        <div v-if="!imagePreview" class="upload-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>点击或拖拽图片到这里上传</p>
          <p class="hint">支持 JPG、PNG、GIF 等格式</p>
        </div>
        <div v-else class="image-preview">
          <img :src="imagePreview" alt="预览图片" />
          <button class="remove-btn" @click.stop="removeImage">×</button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div v-if="imagePreview" class="actions">
        <button 
          @click="extractText" 
          :disabled="isProcessing"
          class="extract-btn"
        >
          <span v-if="!isProcessing">提取文字</span>
          <span v-else>
            <span v-if="progress < 30">初始化中... {{ progress }}%</span>
            <span v-else-if="progress < 90">识别中... {{ progress }}%</span>
            <span v-else>处理中... {{ progress }}%</span>
          </span>
        </button>
        <button 
          @click="clearAll" 
          :disabled="isProcessing"
          class="clear-btn"
        >
          清除
        </button>
      </div>

      <!-- 识别进度 -->
      <div v-if="isProcessing" class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- 识别结果 -->
      <div v-if="extractedText" class="result-area">
        <!-- 识别的文字内容 -->
        <div class="text-result-section">
          <div class="result-header">
            <h3>📝 识别的文字内容</h3>
            <button @click="copyAllText" class="copy-btn">复制全部文字</button>
          </div>
          <div class="result-content">
            <textarea 
              v-model="extractedText" 
              readonly
              class="result-text"
              placeholder="识别结果将显示在这里..."
            ></textarea>
          </div>
        </div>

        <!-- 提取到的手机号 -->
        <div v-if="phoneNumbers.length > 0" class="phone-result-section">
          <div class="result-header">
            <h3>📞 提取到的手机号</h3>
            <div class="header-actions">
              <button @click="copyPhoneNumbers" class="copy-btn">复制全部号码</button>
              <button @click="downloadVCF" class="download-vcf-btn">📥 下载VCF文件</button>
            </div>
          </div>
          <div class="phone-list">
            <div 
              v-for="(phone, index) in phoneNumbers" 
              :key="index" 
              class="phone-item"
            >
              <span class="phone-number">{{ phone }}</span>
              <button @click="copySinglePhone(phone)" class="copy-single-btn">复制</button>
            </div>
          </div>
        </div>
        <div v-else class="no-phone-message">
          <p>💡 提示：未自动识别到手机号，您可以从上方文字中手动查找</p>
          <button @click="retryExtract" class="retry-btn">重新提取手机号</button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const fileInput = ref(null)
const imagePreview = ref(null)
const extractedText = ref('')
const phoneNumbers = ref([])
const isProcessing = ref(false)
const progress = ref(0)
const error = ref('')
const isDragging = ref(false)
let imageFile = null

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processImageFile(file)
  }
}

// 处理拖拽
const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processImageFile(file)
  } else {
    error.value = '请上传图片文件'
  }
}

// 处理图片文件
const processImageFile = (file) => {
  imageFile = file
  error.value = ''
  extractedText.value = ''
  phoneNumbers.value = []
  
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

// 移除图片
const removeImage = () => {
  imagePreview.value = null
  imageFile = null
  extractedText.value = ''
  phoneNumbers.value = []
  error.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// 清除所有
const clearAll = () => {
  removeImage()
}

// 格式化手机号
const formatPhone = (phone) => {
  // 移除所有空格和特殊字符，只保留数字
  const digits = phone.replace(/\D/g, '')
  
  // 手机号格式化：138 0013 8000
  if (digits.length === 11 && /^1[3-9]\d{9}$/.test(digits)) {
    return `${digits.slice(0, 3)}${digits.slice(3, 7)}${digits.slice(7)}`
  }
  
  // 如果不符合手机号格式，返回原始号码
  return phone
}

// 清理OCR识别文本，过滤掉误识别的单个数字和短字符
const cleanOCRText = (text) => {
  if (!text) return text
  
  // 按行分割文本
  const lines = text.split('\n')
  const cleanedLines = []
  
  for (let line of lines) {
    const trimmedLine = line.trim()
    
    // 跳过空行
    if (!trimmedLine) {
      continue
    }
    
    // 跳过单个数字（0-9），这些可能是图标误识别
    if (/^[0-9]$/.test(trimmedLine)) {
      console.log(`过滤掉单个数字: "${trimmedLine}"`)
      continue
    }
    
    // 跳过单个字符（除非是中文或其他非ASCII字符）
    if (trimmedLine.length === 1 && /^[a-zA-Z0-9]$/.test(trimmedLine)) {
      console.log(`过滤掉单个字符: "${trimmedLine}"`)
      continue
    }
    
    // 跳过只有标点符号的行
    if (/^[^\w\u4e00-\u9fa5]+$/.test(trimmedLine)) {
      console.log(`过滤掉纯标点符号行: "${trimmedLine}"`)
      continue
    }
    
    // 保留这一行
    cleanedLines.push(line)
  }
  
  // 重新组合文本，移除多余的空行
  const result = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  
  console.log(`文本清理完成: 原始行数 ${lines.length}, 清理后行数 ${cleanedLines.length}`)
  
  return result
}

// 提取手机号（优化精度）
const extractPhoneNumbers = (text) => {
  const phones = new Set()
  
  // 先清理文本：将多个连续空格/换行/制表符替换为单个空格
  const cleanedText = text.replace(/[\s\n\r\t]+/g, ' ').trim()
  console.log('清理后的文本（前500字符）:', cleanedText.substring(0, 500))
  console.log('完整文本长度:', cleanedText.length)
  
  // 方法1: 使用精确的正则表达式匹配手机号（考虑分隔符）
  // 匹配格式：1[3-9] + 数字（中间可能有空格、横线、括号等）
  const mobilePatterns = [
    // 标准格式：138 0013 8000 或 138-0013-8000 或 13800138000
    /1[3-9][\s\-\(\)]?\d{4}[\s\-\(\)]?\d{4}/g,
    // 格式：1[3-9] + 3位 + 4位 + 4位（如：138 0013 8000）
    /1[3-9][\s\-\(\)]?\d{3}[\s\-\(\)]?\d{4}[\s\-\(\)]?\d{4}/g,
    // 格式：1[3-9] + 任意分隔符 + 数字（更宽松，但后续会严格验证）
    /1[3-9][\s\-\(\)\.]?\d{1,4}[\s\-\(\)\.]?\d{1,4}[\s\-\(\)\.]?\d{1,4}[\s\-\(\)\.]?\d{1,4}/g,
  ]
  
  const allMatches = []
  mobilePatterns.forEach(pattern => {
    const matches = cleanedText.match(pattern) || []
    allMatches.push(...matches)
  })
  
  console.log('找到的所有可能手机号序列:', allMatches)
  
  // 处理每个匹配到的序列
  for (let numStr of allMatches) {
    // 移除所有非数字字符，只保留纯数字
    const digits = numStr.replace(/\D/g, '')
    
    // 严格验证：必须是11位，且符合手机号格式 1[3-9]\d{9}
    if (digits.length === 11 && /^1[3-9]\d{9}$/.test(digits)) {
      phones.add(digits)
      console.log('✓ 找到有效手机号:', digits)
      continue
    }
    
    // 如果长度不是11位，尝试从序列中提取11位手机号
    if (digits.length > 11) {
      // 从长数字中滑动窗口提取11位手机号
      // 优先从开头匹配（因为手机号通常出现在开头）
      for (let i = 0; i <= digits.length - 11; i++) {
        const subDigits = digits.substring(i, i + 11)
        if (/^1[3-9]\d{9}$/.test(subDigits)) {
          phones.add(subDigits)
          console.log('✓ 从长数字中提取到手机号:', subDigits)
          break // 找到一个就够了，避免重复
        }
      }
    }
  }
  
  // 方法2: 使用边界匹配，确保手机号是独立的（前后不是数字）
  // 匹配11位手机号（必须符合手机号格式，且前后不是数字）
  const boundaryMobilePattern = /(?:^|[^\d])(1[3-9]\d{9})(?:[^\d]|$)/g
  let match
  while ((match = boundaryMobilePattern.exec(cleanedText)) !== null) {
    const phone = match[1]
    if (phone.length === 11 && /^1[3-9]\d{9}$/.test(phone)) {
      phones.add(phone)
      console.log('✓ 边界匹配到手机号:', phone)
    }
  }
  
  // 方法3: 从连续数字中提取（处理OCR识别时数字连在一起的情况）
  // 匹配10位以上的连续数字序列
  const longNumberPattern = /\d{11,}/g
  let longMatch
  while ((longMatch = longNumberPattern.exec(cleanedText)) !== null) {
    const longDigits = longMatch[0]
    // 从长数字中滑动窗口提取11位手机号
    for (let i = 0; i <= longDigits.length - 11; i++) {
      const subDigits = longDigits.substring(i, i + 11)
      if (/^1[3-9]\d{9}$/.test(subDigits)) {
        phones.add(subDigits)
        console.log('✓ 从连续数字中提取到手机号:', subDigits)
        break // 找到一个就够了
      }
    }
  }
  
  // 方法4: 处理OCR识别时可能出现的常见错误
  // 例如：数字中间有多个空格、横线等分隔符
  // 匹配：1[3-9] + 任意分隔符 + 数字（总共11位数字）
  const spacedPattern = /1[3-9](?:[\s\-\(\)\.]?\d){9}/g
  while ((match = spacedPattern.exec(cleanedText)) !== null) {
    const digits = match[0].replace(/\D/g, '')
    if (digits.length === 11 && /^1[3-9]\d{9}$/.test(digits)) {
      phones.add(digits)
      console.log('✓ 从带分隔符的序列中提取到手机号:', digits)
    }
  }
  
  // 方法5: 处理OCR可能将数字识别为字母的情况（如1识别为I，0识别为O）
  // 这里我们主要依赖数字识别，但如果需要可以添加字符替换逻辑
  // 暂时跳过，因为OCR应该能识别数字
  
  console.log('最终提取到的手机号（去重前）:', Array.from(phones))
  
  // 转换为数组并格式化
  const result = Array.from(phones).map(formatPhone)
  console.log('格式化后的手机号:', result)
  
  return result
}

// 放大图片以提高OCR识别率（特别是对于小文字）
const enlargeImage = (file, scaleFactor = 2) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // 计算放大后的尺寸
        const width = img.width * scaleFactor
        const height = img.height * scaleFactor
        
        // 创建 canvas 进行放大
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // 使用高质量缩放算法
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // 绘制放大后的图片
        ctx.drawImage(img, 0, 0, width, height)
        
        // 转换为 data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0)
        resolve(dataUrl)
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 压缩和调整图片大小（仅在必要时使用）
const compressImage = (file, maxWidth = 4000, maxHeight = 4000, quality = 0.9) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        
        // 计算缩放比例
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // 创建 canvas 进行压缩
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        
        // 使用高质量缩放
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // 设置白色背景（有助于OCR识别）
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, width, height)
        
        console.log(`压缩图片: ${img.width}x${img.height} -> ${Math.round(width)}x${Math.round(height)}`)
        
        // 转换为 blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 转换为 data URL
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              reject(new Error('图片压缩失败'))
            }
          },
          'image/png',
          quality
        )
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 提取电话号码
const extractText = async () => {
  if (!imageFile) {
    error.value = '请先上传图片'
    return
  }

  isProcessing.value = true
  progress.value = 0
  error.value = ''
  extractedText.value = ''
  phoneNumbers.value = []

  try {
    console.log('开始加载 Tesseract.js...')
    progress.value = 5
    
    // 检查 Tesseract.js 是否已加载
    if (!window.Tesseract) {
      throw new Error('Tesseract.js 未加载，请刷新页面重试')
    }
    
    console.log('使用 CDN 版本的 Tesseract.js')
    progress.value = 10
    
    console.log('开始创建 Worker...')
    
    // 创建 worker - CDN 版本的正确用法
    const worker = await window.Tesseract.createWorker({
      logger: (m) => {
        console.log('Tesseract status:', m.status, m.progress || 0)
        
        // 更新进度
        if (m.status === 'loading tesseract core') {
          progress.value = 10
        } else if (m.status === 'initializing tesseract') {
          progress.value = 15
        } else if (m.status === 'loading language traineddata') {
          progress.value = 20
        } else if (m.status === 'initializing api') {
          progress.value = 25
        } else if (m.status === 'recognizing text') {
          // 识别进度从 25% 到 95%
          const p = m.progress || 0
          progress.value = 25 + Math.round(p * 70)
        }
      }
    })
    
    console.log('Worker 创建成功，加载语言包...')
    progress.value = 30
    
    // 加载语言包
    await worker.loadLanguage('chi_sim+eng')
    progress.value = 50
    
    // 初始化
    await worker.initialize('chi_sim+eng')
    progress.value = 60
    
    console.log('Worker 初始化完成，开始预处理图片...')
    progress.value = 65
    
    // 预处理图片：对于长图和小文字，放大图片以提高识别率
    let imageSource
    if (imageFile instanceof File) {
      console.log('原始图片大小:', (imageFile.size / 1024 / 1024).toFixed(2), 'MB')
      
      // 先加载图片检查尺寸
      const img = new Image()
      const imgDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      
      const imgLoadPromise = new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('原始图片尺寸:', img.width, 'x', img.height)
          
          const isLongImage = img.height > img.width * 1.5 // 高度是宽度的1.5倍以上，认为是长图
          const isVeryLongImage = img.height > img.width * 3 // 超长图
          const isSmallImage = img.width < 1000 && img.height < 2000 // 小图片
          const isVeryLarge = img.width > 4000 || img.height > 8000 // 超大图片（降低阈值）
          const isLargeFile = imageFile.size > 3 * 1024 * 1024 // 文件大于3MB
          const isHugeFile = imageFile.size > 10 * 1024 * 1024 // 超大文件（>10MB）
          
          // 对于长图或小图片，放大以提高OCR识别率
          if ((isLongImage || isSmallImage) && !isVeryLarge) {
            console.log('检测到长图或小图片，放大图片以提高识别率...')
            // 长图放大2倍，小图片放大3倍
            const scaleFactor = isSmallImage ? 3 : 2
            enlargeImage(imageFile, scaleFactor)
              .then(resolve)
              .catch((err) => {
                console.warn('放大失败，使用原图:', err)
                resolve(imgDataUrl)
              })
          }
          // 对于超大图片，使用更高的分辨率限制和质量
          else if (isVeryLarge) {
            console.log('图片超大，使用高分辨率压缩以保持识别质量...')
            compressImage(imageFile, 6000, 12000, 0.98)
              .then(resolve)
              .catch((err) => {
                console.warn('压缩失败，使用原图:', err)
                resolve(imgDataUrl)
              })
          }
          // 其他情况，如果文件很大才压缩
          else if (imageFile.size > 5 * 1024 * 1024) {
            console.log('文件较大(>5MB)，使用高质量压缩...')
            compressImage(imageFile, 5000, 8000, 0.95)
              .then(resolve)
              .catch((err) => {
                console.warn('压缩失败，使用原图:', err)
                resolve(imgDataUrl)
              })
          }
          // 正常大小的图片，直接使用
          else {
            console.log('图片尺寸合适，直接使用原图')
            resolve(imgDataUrl)
          }
        }
        img.onerror = () => {
          console.warn('图片加载失败，使用原图')
          resolve(imgDataUrl)
        }
        img.src = imgDataUrl
      })
      
      imageSource = await imgLoadPromise
      
      // 验证处理后的图片
      if (!imageSource || (typeof imageSource === 'string' && !imageSource.startsWith('data:'))) {
        throw new Error('图片处理失败，无法获取有效的图片数据')
      }
      
      // 检查处理后的图片尺寸
      const processedImg = new Image()
      await new Promise((resolve, reject) => {
        processedImg.onload = () => {
          console.log('处理后的图片尺寸:', processedImg.width, 'x', processedImg.height)
          if (processedImg.width === 0 || processedImg.height === 0) {
            reject(new Error('处理后的图片尺寸无效'))
          } else {
            resolve()
          }
        }
        processedImg.onerror = () => {
          reject(new Error('处理后的图片加载失败'))
        }
        processedImg.src = imageSource
      })
      
      console.log('图片预处理完成')
    } else {
      imageSource = imageFile
    }
    
    console.log('开始识别图片...')
    progress.value = 70
    
    // 验证图片源
    if (!imageSource) {
      throw new Error('图片源无效')
    }
    
    // 如果 imageSource 是 File 对象，转换为 data URL
    if (imageSource instanceof File) {
      console.log('将 File 对象转换为 DataURL...')
      imageSource = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(imageSource)
      })
    }
    
    // 验证 DataURL 格式
    if (typeof imageSource === 'string' && !imageSource.startsWith('data:image/')) {
      throw new Error('图片格式无效，必须是有效的图片 DataURL')
    }
    
    // 设置OCR参数以提高识别准确度（特别是超大图片）
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '1', // 自动页面分割模式
      })
      console.log('OCR参数设置完成')
    } catch (err) {
      console.warn('设置OCR参数失败，使用默认参数:', err)
    }
    
    // 识别图片
    console.log('开始OCR识别...')
    console.log('图片源类型:', typeof imageSource, imageSource.substring ? 'DataURL' : '其他')
    console.log('图片源长度:', typeof imageSource === 'string' ? imageSource.length : 'N/A')
    
    // 检查图片尺寸，如果太大可能需要进一步压缩
    const checkImg = new Image()
    await new Promise((resolve, reject) => {
      checkImg.onload = () => {
        console.log('准备识别的图片尺寸:', checkImg.width, 'x', checkImg.height)
        // 如果图片太大，可能需要进一步处理
        if (checkImg.width > 10000 || checkImg.height > 15000) {
          console.warn('图片尺寸过大，可能导致识别失败，建议压缩')
        }
        resolve()
      }
      checkImg.onerror = reject
      checkImg.src = imageSource
    })
    
    // 使用更简单的识别方式，不传递额外参数
    let text
    try {
      console.log('开始调用 worker.recognize...')
      const result = await worker.recognize(imageSource)
      text = result.data.text
      console.log('识别成功')
    } catch (recognizeError) {
      console.error('识别过程出错:', recognizeError)
      console.error('错误详情:', recognizeError.message, recognizeError.stack)
      
      // 如果是因为图片太大，尝试进一步压缩
      if (checkImg.width > 8000 || checkImg.height > 12000) {
        console.log('图片过大导致识别失败，尝试进一步压缩...')
        // 创建一个临时的 File 对象用于压缩
        const blob = await fetch(imageSource).then(r => r.blob())
        const tempFile = new File([blob], 'temp.jpg', { type: blob.type })
        const compressedSource = await compressImage(tempFile, 6000, 10000, 0.95)
        const result = await worker.recognize(compressedSource)
        text = result.data.text
      } else {
        // 重新抛出错误，让外层 catch 处理
        throw new Error(`OCR识别失败: ${recognizeError.message || '未知错误'}`)
      }
    }
    
    console.log('识别完成，终止 Worker...')
    
    // 终止 worker
    await worker.terminate()
    
    console.log('识别完成，提取到的文本长度:', text.length)
    console.log('识别文本预览（前500字符）:', text.substring(0, 500))
    progress.value = 95
    
    // 清理OCR识别文本，过滤掉误识别的单个数字和短字符
    const cleanedText = cleanOCRText(text.trim())
    extractedText.value = cleanedText
    
    // 提取电话号码
    const phones = extractPhoneNumbers(text)
    phoneNumbers.value = phones
    
    console.log('提取到的电话号码数量:', phones.length)
    progress.value = 100
    
    if (phones.length === 0) {
      error.value = '未在图片中识别到手机号，请确保图片清晰且包含手机号'
    }
    
  } catch (err) {
    console.error('OCR 错误详情:', err)
    error.value = '文字识别失败: ' + (err.message || '未知错误，请查看控制台获取详细信息')
  } finally {
    isProcessing.value = false
    progress.value = 0
  }
}

// 复制所有文字
const copyAllText = async () => {
  try {
    await navigator.clipboard.writeText(extractedText.value)
    // 简单的反馈提示
    const copyBtn = document.querySelector('.text-result-section .copy-btn')
    if (copyBtn) {
      const originalText = copyBtn.textContent
      copyBtn.textContent = '已复制!'
      setTimeout(() => {
        copyBtn.textContent = originalText
      }, 2000)
    }
  } catch (err) {
    error.value = '复制失败，请手动复制'
  }
}

// 复制所有电话号码
const copyPhoneNumbers = async () => {
  try {
    const text = phoneNumbers.value.join('\n')
    await navigator.clipboard.writeText(text)
    // 简单的反馈提示
    const copyBtn = document.querySelector('.phone-result-section .copy-btn')
    if (copyBtn) {
      const originalText = copyBtn.textContent
      copyBtn.textContent = '已复制!'
      setTimeout(() => {
        copyBtn.textContent = originalText
      }, 2000)
    }
  } catch (err) {
    error.value = '复制失败，请手动复制'
  }
}

// 复制单个电话号码
const copySinglePhone = async (phone) => {
  try {
    await navigator.clipboard.writeText(phone)
    // 简单的反馈提示
    const event = new CustomEvent('phoneCopied', { detail: phone })
    window.dispatchEvent(event)
  } catch (err) {
    error.value = '复制失败，请手动复制'
  }
}

// 重新提取手机号（从已识别的文本中）
const retryExtract = () => {
  if (!extractedText.value) {
    error.value = '没有可提取的文本'
    return
  }
  
  console.log('重新提取手机号...')
  const phones = extractPhoneNumbers(extractedText.value)
  phoneNumbers.value = phones
  
  if (phones.length > 0) {
    error.value = ''
    console.log('重新提取成功，找到', phones.length, '个手机号')
  } else {
    error.value = '仍未找到手机号，请检查原始文本中是否包含手机号'
  }
}

// 生成VCF文件内容
const generateVCF = () => {
  if (phoneNumbers.value.length === 0) {
    error.value = '没有可导出的手机号'
    return null
  }
  
  // VCF文件格式：每个电话号码作为一个联系人
  let vcfContent = ''
  
  // 用于跟踪已使用的联系人名称，确保唯一性
  const usedNames = new Map()
  
  phoneNumbers.value.forEach((phone) => {
    // 移除电话号码中的空格和特殊字符，只保留数字
    const cleanPhone = phone.replace(/\D/g, '')
    
    // 生成唯一的联系人名称：如果电话号码重复，添加索引后缀
    let contactName = cleanPhone
    if (usedNames.has(cleanPhone)) {
      // 如果电话号码已存在，添加索引后缀确保唯一
      const count = usedNames.get(cleanPhone)
      usedNames.set(cleanPhone, count + 1)
      contactName = `${cleanPhone}_${count + 1}`
    } else {
      usedNames.set(cleanPhone, 0)
    }
    
    // VCF格式
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
    
    // 生成文件名（包含当前日期时间）
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '')
    link.download = `联系人_${dateStr}_${timeStr}.vcf`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    
    // 清理
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 提示用户
    const downloadBtn = document.querySelector('.download-vcf-btn')
    if (downloadBtn) {
      const originalText = downloadBtn.textContent
      downloadBtn.textContent = '✓ 已下载!'
      setTimeout(() => {
        downloadBtn.textContent = originalText
      }, 2000)
    }
  } catch (err) {
    console.error('下载VCF文件失败:', err)
    error.value = '下载VCF文件失败: ' + (err.message || '未知错误')
  }
}
</script>

<style scoped>
.image-ocr {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.container {
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin: 0 0 2rem 0;
  color: #213547;
  font-size: 1.8rem;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.upload-area:hover {
  border-color: #646cff;
  background: #f0f0ff;
}

.upload-area.dragging {
  border-color: #646cff;
  background: #e8e8ff;
  transform: scale(1.02);
}

.upload-placeholder {
  color: #666;
}

.upload-placeholder svg {
  margin-bottom: 1rem;
  color: #999;
}

.upload-placeholder p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.hint {
  font-size: 0.875rem;
  color: #999;
}

.image-preview {
  position: relative;
  max-width: 100%;
  max-height: 500px;
}

.image-preview img {
  max-width: 100%;
  max-height: 500px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.remove-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 32px;
  height: 32px;
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

.remove-btn:hover {
  transform: scale(1.1);
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  justify-content: center;
}

.extract-btn,
.clear-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.extract-btn {
  background: #646cff;
  color: white;
}

.extract-btn:hover:not(:disabled) {
  background: #535bf2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(100, 108, 255, 0.4);
}

.extract-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.clear-btn {
  background: #f0f0f0;
  color: #333;
}

.clear-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  margin-top: 1rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #646cff, #535bf2);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.result-area {
  margin-top: 2rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1.5rem;
}

.text-result-section {
  margin-bottom: 2rem;
}

.phone-result-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.result-header h3 {
  margin: 0;
  color: #213547;
  font-size: 1.2rem;
}

.copy-btn {
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.3s;
}

.copy-btn:hover {
  background: #35a372;
}

.download-vcf-btn {
  padding: 0.5rem 1rem;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.3s;
}

.download-vcf-btn:hover {
  background: #535bf2;
}

.result-content {
  margin-top: 1rem;
}

.result-text {
  width: 100%;
  min-height: 200px;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
  background: #fafafa;
}

.result-text:focus {
  outline: none;
  border-color: #646cff;
  background: white;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #ffe6e6;
  color: #d32f2f;
  border-radius: 6px;
  border-left: 4px solid #d32f2f;
}

.phone-list {
  margin-top: 1rem;
}

.phone-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #646cff;
  transition: background 0.2s;
}

.phone-item:hover {
  background: #e9ecef;
}

.phone-number {
  font-size: 1.1rem;
  font-weight: 500;
  color: #213547;
  font-family: 'Courier New', monospace;
}

.copy-single-btn {
  padding: 0.4rem 0.8rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.3s;
}

.copy-single-btn:hover {
  background: #35a372;
}

.no-phone-message {
  margin-top: 1rem;
  padding: 1.5rem;
  background: #fff3cd;
  border-radius: 6px;
  border-left: 4px solid #ffc107;
}

.no-phone-message p {
  margin: 0 0 1rem 0;
  color: #856404;
  font-weight: 500;
}

.hint-text {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.raw-text {
  margin-top: 1rem;
}

.raw-text summary {
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 4px;
  background: #f0f0f0;
  margin-bottom: 0.5rem;
}

.raw-text summary:hover {
  background: #e0e0e0;
}

.text-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.retry-btn {
  padding: 0.5rem 1rem;
  background: #646cff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #535bf2;
}

@media (max-width: 768px) {
  .image-ocr {
    padding: 1rem;
  }
  
  .container {
    padding: 1.5rem;
  }
  
  .upload-area {
    padding: 2rem 1rem;
    min-height: 200px;
  }
  
  .actions {
    flex-direction: column;
  }
  
  .extract-btn,
  .clear-btn {
    width: 100%;
  }
}
</style>

