# 部署说明

## 自动部署（推荐）

使用 GitHub Actions 自动部署：

1. 确保已创建 `.github/workflows/deploy.yml` 文件（已包含在项目中）
2. 在 GitHub 仓库设置中：
   - 进入 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 如果看不到 "GitHub Actions" 选项，先推送一次代码触发 workflow
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署
4. 部署完成后，访问：`https://你的用户名.github.io/phone/`

**注意**：首次部署可能需要几分钟时间，可以在 Actions 标签页查看部署进度。

## 手动部署

### 方法一：使用 gh-pages 分支

1. 构建项目：
   ```bash
   npm run build
   ```

2. 将 `dist` 目录的内容部署到 `gh-pages` 分支的 `phone` 目录：
   ```bash
   # 如果使用 gh-pages 分支
   git subtree push --prefix dist origin gh-pages
   ```

### 方法二：直接上传到 GitHub Pages

1. 构建项目：
   ```bash
   npm run build
   ```

2. 进入 `dist` 目录

3. 将以下文件上传到 GitHub Pages 的 `phone` 目录：
   - `index.html`
   - `vite.svg`
   - `assets/` 目录（包含所有文件）

### 方法三：使用 GitHub CLI

```bash
npm run build
cd dist
gh repo deploy --source=. --branch=gh-pages --dir=phone
```

## 重要提示

⚠️ **只部署 `dist` 目录的内容，不要部署源代码！**

- ✅ 部署：`dist/index.html`、`dist/assets/`、`dist/vite.svg`、`dist/404.html`
- ❌ 不要部署：`src/`、源代码的 `index.html`、`node_modules/`

## 故障排除

### 问题：页面显示空白或 404

1. **检查 base 路径**：确保 `vite.config.js` 中的 `base: '/phone/'` 与你的仓库名称匹配
2. **检查资源路径**：打开浏览器开发者工具，查看 Console 和 Network 标签页，确认资源文件（JS、CSS）是否正确加载
3. **清除缓存**：按 `Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）强制刷新页面
4. **检查 GitHub Pages 设置**：
   - Settings → Pages → Source 应该选择 "GitHub Actions"
   - 如果使用 gh-pages 分支，Source 应该选择该分支

### 问题：资源文件 404

- 确保 `vite.config.js` 中的 `base` 配置正确
- 检查构建后的 `dist/index.html` 中的资源路径是否包含 `/phone/` 前缀
- 重新构建：`npm run build`，然后重新部署

### 问题：GitHub Actions 部署失败

- 检查 Actions 标签页中的错误信息
- 确保仓库已启用 GitHub Pages
- 确保 workflow 文件语法正确（YAML 格式）

## 验证部署

部署后访问：`https://lv-jing.github.io/phone/`

检查页面源代码，应该看到：
```html
<script type="module" crossorigin src="/phone/assets/index-*.js"></script>
<link rel="stylesheet" crossorigin href="/phone/assets/index-*.css">
```

而不是：
```html
<script type="module" src="/src/main.js"></script>
```

