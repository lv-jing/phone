# 部署说明

## 自动部署（推荐）

使用 GitHub Actions 自动部署：

1. 确保已创建 `.github/workflows/deploy.yml` 文件
2. 在 GitHub 仓库设置中：
   - 进入 Settings → Pages
   - Source 选择 "GitHub Actions"
3. 推送代码到 `main` 分支，GitHub Actions 会自动构建并部署

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

- ✅ 部署：`dist/index.html`、`dist/assets/`、`dist/vite.svg`
- ❌ 不要部署：`src/`、源代码的 `index.html`、`node_modules/`

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

