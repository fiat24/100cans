# HN 博客每日摘要 - 永久部署指南

本指南将帮助您将此项目部署为永久运行的网站。

## 1. 准备工作

### 数据库 (必须)
您需要一个永久性的 MySQL 数据库。推荐使用以下免费/廉价方案：
- **TiDB Cloud**: 提供免费的 Serverless 实例，非常适合此项目。
- **Aiven**: 提供免费的 MySQL 托管。
- **PlanetScale**: 优秀的开发者体验。

### SiliconFlow API
确保您的 SiliconFlow 账户有足够的余额，DeepSeek-R1 模型虽然性价比高，但仍需消耗额度。

## 2. 部署到 Vercel

1. **创建 GitHub 仓库**：将此文件夹中的所有代码推送到您的 GitHub 私有或公开仓库。
2. **在 Vercel 中导入**：
   - 登录 [Vercel](https://vercel.com)。
   - 点击 "Add New" -> "Project"。
   - 导入刚才创建的 GitHub 仓库。
3. **配置环境变量**：
   在 Vercel 的 "Environment Variables" 设置中添加以下内容：
   - `DATABASE_URL`: 您的 MySQL 连接字符串 (例如: `mysql://user:pass@host:port/db`)
   - `JWT_SECRET`: 任意长随机字符串。
   - `SILICONFLOW_API_KEY_1`: 您的第一个 API Key。
   - `SILICONFLOW_API_KEY_2`: 您的第二个 API Key (可选)。
4. **部署**：点击 "Deploy"。

## 3. 自动化与永久运行

- **自动更新**：项目已配置 `vercel.json` 中的 `crons` 任务，每天 UTC 02:00 会自动触发文章抓取和 AI 总结。
- **手动刷新**：您可以随时通过网页上的“手动刷新”按钮更新内容。
- **持久化**：所有抓取的文章和生成的摘要都将永久存储在您的数据库中。

## 4. 维护

- **监控**：您可以在 Vercel 控制台的 "Logs" 中查看每日自动任务的运行情况。
- **数据库备份**：建议定期备份您的 MySQL 数据库。

---
**祝贺！** 您的 AI 博客摘要网站现在已经是一个永久运行的在线服务了。
