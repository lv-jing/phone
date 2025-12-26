# GitHub Pages 部署说明

## 部署方式：Deploy from a branch

### 重要配置

- **Base 路径**：`/phone/`（在 `vite.config.js` 中配置）
- **访问地址**：`https://你的用户名.github.io/phone/`

### 部署步骤

#### 方法一：部署到 gh-pages 分支的 /phone/ 目录（推荐）

1. **构建项目**：
   ```bash
   yarn build
   ```

2. **切换到 gh-pages 分支**（如果不存在则创建）：
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   ```

3. **将 dist 目录的内容复制到 phone 子目录**：
   ```bash
   # Windows PowerShell
   mkdir phone
   Copy-Item -Path dist\* -Destination phone\ -Recurse -Force
   
   # 或者手动复制 dist 目录下的所有文件到 phone 目录
   ```

4. **提交并推送**：
   ```bash
   git add phone/
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

5. **在 GitHub 设置中**：
   - 进入 Settings → Pages
   - Source 选择 `gh-pages` 分支
   - 访问：`https://你的用户名.github.io/phone/`

#### 方法二：部署到 gh-pages 分支的根目录

如果要将 dist 内容直接部署到根目录，需要修改 base 配置：

1. **修改 `vite.config.js`**：
   ```js
   base: '/',  // 改为根路径
   ```

2. **重新构建**：
   ```bash
   yarn build
   ```

3. **部署 dist 内容到 gh-pages 分支根目录**：
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   git add dist/
   git mv dist/* .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

4. **访问地址**：`https://你的用户名.github.io/`

### 验证部署

部署后检查：

1. **访问页面**：打开 `https://你的用户名.github.io/phone/`
2. **检查资源**：打开浏览器开发者工具（F12）
   - 查看 Network 标签页，确认所有资源（JS、CSS、SVG）都返回 200 状态码
   - 查看 Console 标签页，确认没有 404 错误

3. **检查资源路径**：查看页面源代码，应该看到：
   ```html
   <script type="module" crossorigin src="/phone/assets/index-*.js"></script>
   <link rel="stylesheet" crossorigin href="/phone/assets/index-*.css">
   ```

### 常见问题

#### 问题：资源文件 404（main.js、vite.svg 等）

**原因**：base 路径配置与部署路径不匹配

**解决方案**：
1. 确认你的访问 URL：
   - 如果是 `username.github.io/phone/` → base 应该是 `/phone/`
   - 如果是 `username.github.io/` → base 应该是 `/`

2. 检查 `vite.config.js` 中的 `base` 配置

3. 重新构建：
   ```bash
   yarn build
   ```

4. 检查 `dist/index.html` 中的资源路径是否正确

#### 问题：页面空白

1. 打开浏览器开发者工具（F12）
2. 查看 Console 标签页的错误信息
3. 查看 Network 标签页，确认资源是否正确加载
4. 清除浏览器缓存后重试

#### 问题：部署后还是旧版本

1. 清除浏览器缓存：`Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）
2. 检查 GitHub Pages 部署是否完成（Settings → Pages 中查看）
3. 确认推送了最新的构建文件

### 快速部署脚本（Windows PowerShell）

创建 `deploy.ps1` 文件：

```powershell
# 构建项目
yarn build

# 切换到 gh-pages 分支
git checkout gh-pages 2>$null
if ($LASTEXITCODE -ne 0) {
    git checkout --orphan gh-pages
    git rm -rf .
}

# 创建 phone 目录并复制文件
if (Test-Path phone) {
    Remove-Item -Path phone -Recurse -Force
}
New-Item -ItemType Directory -Path phone
Copy-Item -Path dist\* -Destination phone\ -Recurse -Force

# 提交并推送
git add phone/
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# 切换回主分支
git checkout main
```

运行：
```powershell
.\deploy.ps1
```

