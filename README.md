<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="116" height="116" />

  <h1>Crush LeetCode</h1>

  <p><strong>把刷过的 LeetCode 题，真正变成会做的题。</strong></p>
  <p><strong>Turn solved LeetCode problems into long-term memory.</strong></p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-0.0.2%20beta-ffb020?style=for-the-badge" alt="Version 0.0.2 beta" /></a>
    <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3" />
    <img src="https://img.shields.io/badge/FSRS-ts--fsrs%205.3-blueviolet?style=for-the-badge" alt="ts-fsrs 5.3" />
    <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-red?style=for-the-badge" alt="License CC BY-NC 4.0" />
  </p>

  <p>
    <a href="#中文说明">中文说明</a> ·
    <a href="#english">English</a> ·
    <a href="#development">Development</a>
  </p>
</div>

---

## 中文说明

### ✨ 项目介绍

**Crush LeetCode** 是一款 Chrome 扩展，帮助你把 LeetCode 刷题变成一个更稳定的复习流程。

它会在你提交通过后记录题目，根据你的掌握程度安排下一次复习，并提供题目笔记、今日复习列表、桌面提醒和周报能力。你不用再额外维护表格，也不用靠感觉猜今天该复习什么。

### 🚀 核心功能

| 功能 | 说明 |
| --- | --- |
| ✅ AC 自动记录 | 支持 `leetcode.com` 和 `leetcode.cn`，通过后自动弹出评分面板。 |
| 🧠 智能复习计划 | 基于 `FSRS` 间隔重复算法，按你的掌握情况安排下次复习。 |
| 📌 今日复习 | Popup 中展示今天该复习的题、已完成题和逾期题。 |
| 📝 Markdown 笔记 | 每道题都可以写独立笔记，支持代码高亮预览。 |
| 🔔 提醒和周报 | 支持桌面提醒，也可以配置邮箱接收复习周报。 |
| 💾 数据备份 | 支持导出 / 导入 JSON，并在导入前预览数据变化。 |
| 🌗 双语与主题 | 支持中文 / English，以及浅色、深色、跟随系统主题。 |

### 🌟 我们的优势

- **贴近刷题场景**：直接运行在 LeetCode 页面和浏览器扩展中，不需要切换到额外工具。
- **复习更有节奏**：不是简单按固定天数提醒，而是根据你每次的真实反馈调整复习时间。
- **笔记和复习连在一起**：题目、评分、复习日志和 Markdown 笔记都围绕同一道题沉淀。
- **数据可带走**：支持 JSON 备份和恢复，不把你的刷题记录锁死在一个地方。

### 📸 截图

<div align="center">

| 评分弹窗 | 掌握度看板 |
|:---:|:---:|
| ![评分弹窗](./public/shots/rating-modal.png) | ![掌握度看板](./public/shots/dashboard.png) |

| Markdown 笔记 | 设置页面 |
|:---:|:---:|
| ![Markdown 笔记](./public/shots/notes.png) | ![设置页面](./public/shots/settings.png) |

</div>

### 🛠 安装使用

1. 打开 [Releases](https://github.com/oldtommmy/crush_leetcode/releases)，下载最新的 zip 包并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 开启右上角 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**，选择解压后的目录。

### 🧭 使用流程

1. 在 LeetCode 正常做题并提交。
2. Accepted 后选择你的掌握程度：`完全没思路`、`困难`、`一般`、`轻松`。
3. 打开扩展 Popup 查看今日复习计划。
4. 在题目页或 Popup 中记录 Markdown 笔记。
5. 在设置页开启提醒、配置周报邮箱或导入导出数据。

### 🗺 后续优化方向

- **更强的数据存储**：升级到 `IndexedDB`，让大量题目和笔记也能保持流畅。
- **更直观的复习分析**：展示薄弱标签、逾期趋势和容易忘的题。
- **云端备份 / 同步**：支持跨设备恢复数据，减少换电脑或重装浏览器的成本。
- **AI 复盘辅助**：在用户主动选择的前提下，总结笔记中的错因和常见模式。
- **自动化发布**：用 `GitHub Actions` 自动测试、构建和打包发布版本。

---

## English

### ✨ Introduction

**Crush LeetCode** is a Chrome extension that helps you turn LeetCode practice into a repeatable review system.

After you solve a problem, it records the result, asks how well you understood it, schedules the next review, and keeps your notes, reminders, and weekly digest in one place.

### 🚀 Features

| Feature | Description |
| --- | --- |
| ✅ Accepted Detection | Supports `leetcode.com` and `leetcode.cn`, with a rating panel after accepted submissions. |
| 🧠 Smart Review Plan | Uses the `FSRS` spaced repetition algorithm to schedule reviews from your feedback. |
| 📌 Daily Plan | Shows due problems, completed problems, and overdue problems in the popup. |
| 📝 Markdown Notes | Keep per-problem notes with Markdown preview and code highlighting. |
| 🔔 Reminders & Digest | Supports desktop reminders and optional weekly email summaries. |
| 💾 Backup & Import | Export and import JSON backups with a preview before applying changes. |
| 🌗 Bilingual & Theme | Supports English, Simplified Chinese, light mode, dark mode, and system theme. |

### 🌟 What Makes It Useful

- **Built for the LeetCode workflow**: Works directly on problem pages and in the browser popup.
- **Review timing that adapts**: Schedules reviews based on your feedback instead of fixed intervals.
- **Notes stay connected to problems**: Ratings, review logs, and Markdown notes all belong to the same problem record.
- **Portable data**: JSON backup and import keep your progress recoverable.

### 📸 Screenshots

<div align="center">

| Rating Modal | Dashboard |
|:---:|:---:|
| ![Rating Modal](./public/shots/rating-modal.png) | ![Dashboard](./public/shots/dashboard.png) |

| Markdown Notes | Settings |
|:---:|:---:|
| ![Markdown Notes](./public/shots/notes.png) | ![Settings](./public/shots/settings.png) |

</div>

### 🛠 Installation

1. Download the latest zip from [Releases](https://github.com/oldtommmy/crush_leetcode/releases) and unzip it.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

### 🧭 How To Use

1. Solve and submit problems on LeetCode as usual.
2. After an Accepted result, rate your understanding: `No clue`, `Hard`, `Normal`, or `Too easy`.
3. Open the extension popup to review today's plan.
4. Write Markdown notes from the problem page or popup.
5. Configure reminders, weekly digest email, and data backup from the settings page.

### 🗺 Roadmap

- **Better storage**: Move large local data to `IndexedDB` for better performance.
- **Review analytics**: Show weak tags, overdue trends, and problems you often forget.
- **Cloud backup / sync**: Make it easier to recover data across devices.
- **AI-assisted review**: Summarize selected notes and common mistakes when users opt in.
- **Release automation**: Use `GitHub Actions` to test, build, package, and release more reliably.

---

## Development

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

| Path | Purpose |
| --- | --- |
| `src/background` | Service worker, alarms, notifications, weekly digest |
| `src/content` | LeetCode page detection, AC observer, floating UI |
| `src/options` | Settings, reminders, email digest, import/export |
| `src/popup` | Daily plan, problem library, note editor |
| `src/shared` | Storage, FSRS scheduler, selectors, i18n, shared types |
| `tests` | Scheduler, selector, import, alarm, and delivery tests |

## License

Licensed under **CC BY-NC 4.0**. Non-commercial use only.

<div align="center">
  <p><strong>If Crush LeetCode helps you, a Star means a lot.</strong></p>
  <p><strong>如果这个项目对你有帮助，欢迎 Star 支持。</strong></p>
  <img src="./public/icons/wechat-pay.png" alt="Sponsor" width="200" />
</div>
