<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="120" height="120" />

  <h1>Crush LeetCode</h1>

  <p>
    一个给 LeetCode 刷题者设计的间隔复习、笔记沉淀与可视化数据周报系统。<br />
    A spaced repetition, note-taking, and visual weekly digest system for LeetCode practitioners.
  </p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-v0.0.1-ffb020?style=for-the-badge" alt="Version v0.0.1" /></a>
    <img src="https://img.shields.io/badge/Chrome%20Extension-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension MV3" />
    <img src="https://img.shields.io/badge/language-中文%20%7C%20English-00bcd4?style=for-the-badge" alt="Bilingual" />
  </p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode/stargazers"><img src="https://img.shields.io/github/stars/oldtommmy/crush_leetcode?style=flat-square" alt="GitHub stars" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/issues"><img src="https://img.shields.io/github/issues/oldtommmy/crush_leetcode?style=flat-square" alt="GitHub issues" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/github/v/release/oldtommmy/crush_leetcode?style=flat-square" alt="Latest release" /></a>
  </p>

  <p>
    <a href="#中文">中文</a> ·
    <a href="#english">English</a> ·
    <a href="https://github.com/oldtommmy/crush_leetcode/releases">Download</a> ·
    <a href="https://github.com/oldtommmy/crush_leetcode/issues">Feedback</a> ·
    <a href="#support-this-project">Sponsor</a>
  </p>
</div>

---

<a id="中文"></a>

## 中文

### 目录

- [怎么使用](#怎么使用)
- [从 Release 安装](#从-release-安装)
- [功能预览](#功能预览)
- [核心功能](#核心功能)
- [使用流程](#使用流程)
- [手动验收清单](#手动验收清单)
- [项目结构](#项目结构)
- [Roadmap](#roadmap)
- [常见问题](#常见问题)
- [Support This Project](#support-this-project)

### 怎么使用

1. 前往 [Releases](https://github.com/oldtommmy/crush_leetcode/releases) 下载最新的 `crush_leetcode_v0.0.1.zip` 并解压。
2. 在 Chrome 打开 `chrome://extensions`。
3. 开启右上角 `开发者模式`。
4. 点击 `加载已解压的扩展程序`，选择刚才解压出的目录。
5. 打开 LeetCode 任意题目页面。
6. 提交代码并拿到 `Accepted` 后，在弹窗中评分。
7. 通过扩展 Popup 做每日复习，或在设置页配置每周可视化周报。

### 功能预览

| 区域 | 你会看到什么 |
| --- | --- |
| LeetCode 题目页 | AC 检测、悬浮操作面板、自动评分入口 |
| Popup | 统计概览（总数、逾期、趋势）、复习列表、笔记编辑器 |
| Options | 健康检查面板、导入预览、周报配置（官方代理/EmailJS/Resend/Webhook） |

### 核心功能

| 功能 | 说明 |
| --- | --- |
| **AC 自动识别** | 精准抓取题目 ID、标签 (Tags)、难度及双语标题，支持全球站和中文站 |
| **间隔复习** | 按主观难度评分（轻松到没思路）自动安排下一次复习时间 |
| **可视化周报** | 自动生成包含近 7 天复习趋势图表和逾期任务汇总的 HTML 邮件周报 |
| **增强控制面板** | Popup 集成实时统计，包括总题目数、逾期任务及近 7 天活跃度 |
| **Markdown 笔记** | 每道题独立编辑器，沉淀思路、坑点和代码模板 |
| **导入预览** | JSON 备份导入前可预览题目、笔记数及版本冲突，确保数据安全 |
| **安装诊断** | 设置页内置健康检查面板，实时监控自动弹窗和提醒投递状态 |

### 使用流程

1. **刷题**: 像往常一样在 LeetCode 提交代码。
2. **评分**: 当获得 `Accepted` 结果时，页面会自动弹出评分面板。根据你的掌握情况选择“轻松/一般/困难/没思路”。
3. **复习**: 点击浏览器右上角的扩展图标（Popup），在“今日复习”列表中查看并完成到期的题目。
4. **笔记**: 在复习或刷题时，点击“笔记”按钮即可在侧边栏使用 Markdown 记录核心思路。

### 手动验收清单

- 在 LeetCode 提交一份 Accepted 代码并确认弹出评分框。
- 打开扩展 Popup，确认题目进入复习列表，并查看统计面板。
- 在 Popup 中完成一次到期复习并编辑 Markdown 笔记。
- 在 Options 中确认健康检查面板显示正常。
- 导出一份 JSON 备份，导入时确认预览摘要正确，再执行恢复。
- 配置邮件提醒并在至少有一道题的情况下发送测试邮件，确认收到可视化周报。

### 项目结构

```text
src/background   后台 service worker、提醒去重和可视化周报逻辑
src/content      LeetCode 页面注入、AC 检测和悬浮交互
src/popup        每日复习弹窗、统计看板 UI
src/options      设置页、健康检查、导入预览、邮件配置
src/shared       调度算法、存储层、选择器和共享类型
```

### Roadmap

- [x] 提交后 AC 自动识别与双语标题抓取
- [x] Popup 每日复习流与可视化统计面板
- [x] 每题 Markdown 笔记
- [x] 导入预览与冲突检测系统
- [x] 可视化邮件周报集成与去重逻辑
- [x] 官方代发邮件域名验证完成
- [ ] 更灵活的复习策略自定义 UI

### 常见问题

**为什么评分弹窗只会在提交后出现？**

为了避免在浏览题解或讨论时误触发，扩展只会在真实提交且结果为 `Accepted` 时反应。

**支持国际站和中国站吗？**

支持，`leetcode.com` 和 `leetcode.cn` 均已深度适配。

**数据存在哪里？**

默认存储在浏览器本地的 `chrome.storage.local`，保障隐私安全。

---

<a id="english"></a>

## English

### Table Of Contents

- [How To Use](#how-to-use)
- [Preview](#preview)
- [Core Features](#core-features)
- [Review Flow](#review-flow)
- [Manual QA Checklist](#manual-qa-checklist)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Support This Project](#support-this-project)

### How To Use

1. Go to [Releases](https://github.com/oldtommmy/crush_leetcode/releases) and download the latest `crush_leetcode_v0.0.1.zip`, then unzip it.
2. Go to `chrome://extensions` in Chrome and enable `Developer mode`.
3. Click `Load unpacked` and select the extracted folder.
4. Solve a problem on LeetCode and get `Accepted`.
5. Rate the difficulty to schedule your first review.
6. Use the Popup dashboard daily or configure weekly email digests.

### Core Features

| Feature | Description |
| --- | --- |
| **Smart AC Detection** | Captures IDs, Tags, and accurate Difficulty across Global and CN sites |
| **Spaced Repetition** | Intelligent scheduling based on your subjective evaluation |
| **Weekly Visual Digest** | HTML email reports featuring 7-day review trends and visual charts |
| **Advanced Dashboard** | Popup dashboard with aggregate stats: Total, Due, and Trends |
| **Markdown Notes** | Dedicated editor per problem for capturing patterns and complexities |
| **Import Preview** | Pre-import summary to detect conflicts and version mismatches |
| **Health Diagnostics** | Real-time diagnostic panel to monitor extension and service status |

### Manual QA Checklist

- Submit an Accepted solution and confirm the rating modal appears.
- Open the Popup, check the stats dashboard, and confirm the problem is stored.
- Complete a due review and update its Markdown note.
- Verify the health check panel in Options.
- Export a JSON backup, verify the import preview, and restore it.
- Configure email services and send a test visual weekly digest.

---

<a id="support-this-project"></a>

## Support This Project

如果这个项目对你有帮助，欢迎支持一下继续更新：

If this project helps your LeetCode workflow, you can support it here:

<div align="center">
  <img src="./public/icons/wechat-pay.png" alt="WeChat Pay" width="260" />
  <p><strong>请我喝杯奶茶 / Buy me a milk tea</strong></p>
</div>

---

## Links

- Repository: `https://github.com/oldtommmy/crush_leetcode`
- Issues: `https://github.com/oldtommmy/crush_leetcode/issues`
- Releases: `https://github.com/oldtommmy/crush_leetcode/releases`
