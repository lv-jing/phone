# GitHub Pages 部署说明

## 问题解决：main.js 404 错误

**原因**：`vite.config.js` 中的 `base` 路径配置不正确，导致资源文件路径错误。

**已修复**：已将 `base` 设置为 `/phone/`，资源路径现在正确指向 `/phone/assets/...`

## 部署步骤

### 方法一：Deploy from a branch（推荐）

1. **构建项目**：
   ```bash
   yarn build
   ```

2. **部署 dist 目录**：
   - 如果使用 `gh-pages` 分支：
     ```bash
     # 切换到 gh-pages 分支或创建新分支
     git checkout -b gh-pages
     # 将 dist 目录的内容复制到根目录
     cp -r dist/* .
     git add .
     git commit -m "Deploy to GitHub Pages"
     git push origin gh-pages
     ```
   
   - 如果使用 `main` 分支的 `dist` 目录：
     ```bash
     # 构建后，在 GitHub 仓库设置中：
     # Settings → Pages → Source 选择 "Deploy from a branch"
     # Branch 选择 main，目录选择 /dist
     ```

3. **配置 GitHub Pages**：
   - 进入仓库的 **Settings** → **Pages**
   - **Source** 选择 "Deploy from a branch"
   - **Branch** 选择你的部署分支（如 `gh-pages` 或 `main`）
   - **Folder** 选择 `/`（如果部署在分支根目录）或 `/dist`（如果部署 dist 目录）

4. **访问网站**：
   ```
   https://你的用户名.github.io/phone/
   ```

## 重要配置说明

### base 路径配置

在 `vite.config.js` 中，`base` 路径必须与你的 GitHub Pages 访问路径匹配：

- **如果仓库名是 `phone`**：`base: '/phone/'`
- **如果仓库名是 `你的用户名.github.io`**（个人主页）：`base: '/'`
- **如果部署在子目录**：`base: '/子目录名/'`

### 修改 base 路径

如果仓库名不是 `phone`，需要修改 `vite.config.js`：

```javascript
export default defineConfig({
    base: '/你的仓库名/',  // 修改这里
    // ... 其他配置
})
```

然后重新构建：
```bash
yarn build
```

## 验证部署

部署后检查：

1. **访问网站**：`https://你的用户名.github.io/phone/`

2. **检查资源路径**：
   - 打开浏览器开发者工具（F12）
   - 查看 Network 标签页
   - 确认 JS 和 CSS 文件能正常加载（状态码 200）
   - 资源路径应该是：`/phone/assets/index-*.js` 和 `/phone/assets/index-*.css`

3. **检查控制台**：
   - 不应该有 404 错误
   - 不应该有 "Failed to load resource" 错误

## 常见问题

### 问题 1：资源文件 404

**原因**：`base` 路径配置不正确

**解决**：
1. 确认仓库名称
2. 修改 `vite.config.js` 中的 `base` 路径
3. 重新构建：`yarn build`
4. 重新部署

### 问题 2：页面空白

**原因**：可能是缓存问题或资源路径错误

**解决**：
1. 清除浏览器缓存（Ctrl+Shift+R）
2. 检查浏览器控制台的错误信息
3. 确认资源文件路径是否正确

### 问题 3：本地正常，GitHub Pages 不正常

**原因**：本地开发使用 `/` 路径，但 GitHub Pages 使用 `/phone/` 路径

**解决**：
- 确保 `vite.config.js` 中的 `base` 设置为 `/phone/`
- 使用 `yarn preview` 本地预览生产构建，验证路径是否正确

## 部署检查清单

- [ ] `vite.config.js` 中 `base` 路径正确
- [ ] 已运行 `yarn build` 构建项目
- [ ] `dist` 目录包含所有必要文件（index.html, assets/, vite.svg）
- [ ] GitHub Pages 设置正确（分支和目录）
- [ ] 资源路径包含正确的 base 前缀（如 `/phone/assets/...`）

