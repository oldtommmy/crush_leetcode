<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="116" height="116" />

  <h1>Crush LeetCode</h1>

  <p><strong>把刷过的题，真正变成会做的题。</strong></p>
  <p><strong>Turn solved LeetCode problems into long-term memory.</strong></p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-0.0.1%20beta-ffb020?style=for-the-badge" alt="Version 0.0.1 beta" /></a>
    <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3" />
    <img src="https://img.shields.io/badge/FSRS-ts--fsrs%205.3-blueviolet?style=for-the-badge" alt="ts-fsrs 5.3" />
    <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-red?style=for-the-badge" alt="License CC BY-NC 4.0" />
  </p>

  <p>
    <a href="#why">Why</a> ·
    <a href="#features">Features</a> ·
    <a href="#screenshots">Screenshots</a> ·
    <a href="#install">Install</a> ·
    <a href="#roadmap">Roadmap</a> ·
    <a href="#development">Development</a>
  </p>
</div>

---

<a id="why"></a>

## Why / 为什么需要它

> **刷题最怕的不是没做过，而是做过又忘。**  
> Crush LeetCode 把 AC、评分、复习、笔记和提醒串成一个闭环，让每道题都有下一次出现的理由。

Many tools record what you have solved. Crush LeetCode focuses on what you can still recall later.

<table>
  <tr>
    <td><strong>科学复习</strong><br />FSRS schedules reviews from your feedback, not from a fixed 1/2/4/7-day table.</td>
    <td><strong>贴近流程</strong><br />Works inside LeetCode pages, the extension popup, and browser reminders.</td>
    <td><strong>长期沉淀</strong><br />Keeps problem state, review logs, Markdown notes, backups, and digest data together.</td>
  </tr>
  <tr>
    <td><strong>Smarter Review</strong><br />Prioritizes problems by retrievability and overdue days.</td>
    <td><strong>Less Noise</strong><br />Avoids repeated same-day prompts and unnecessary weekly emails.</td>
    <td><strong>Portable Data</strong><br />Exports and imports full JSON backups with preview before merge.</td>
  </tr>
</table>

<a id="features"></a>

## Features / 已实现功能

| Area | What It Does | 中文说明 |
| --- | --- | --- |
| **Accepted Detection** | Detects accepted submissions on `leetcode.com` and `leetcode.cn`. | AC 后自动弹出评分面板，也支持手动打开。 |
| **FSRS Scheduling** | Uses `ts-fsrs@5.3.x` to update stability, difficulty, reps, lapses, and next review time. | 根据“完全没思路 / 困难 / 一般 / 轻松”动态安排下次复习。 |
| **Daily Plan** | Shows due problems, completed problems, overdue count, total library, and 7-day review stats. | Popup 里直接完成今日复习、打开原题或归档题目。 |
| **Markdown Notes** | Provides per-problem notes with preview and code highlighting. | 每道题独立笔记，适合记录思路、错因和模板。 |
| **Reminders & Digest** | Sends desktop reminders and optional weekly email summaries. | 到点提醒待复习题，周报展示复习趋势和逾期情况。 |
| **Backup & Import** | Exports/imports JSON with a preview of new, overwritten, and invalid records. | 数据在 `chrome.storage.local`，可完整备份迁移。 |
| **Bilingual UI** | Supports English and Simplified Chinese, plus light/dark/system theme. | 中英文界面和主题模式已内置。 |

<a id="screenshots"></a>

## Screenshots / 截图

<div align="center">

| Rating Modal | Dashboard |
|:---:|:---:|
| ![Rating Modal](./public/shots/rating-modal.png) | ![Dashboard](./public/shots/dashboard.png) |

| Markdown Notes | Settings |
|:---:|:---:|
| ![Markdown Notes](./public/shots/notes.png) | ![Settings](./public/shots/settings.png) |

</div>

<a id="install"></a>

## Install / 安装使用

### Install from Release

1. Download the latest zip from [Releases](https://github.com/oldtommmy/crush_leetcode/releases) and unzip it.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

### 使用流程

1. 在 LeetCode 正常做题并提交。
2. Accepted 后按真实掌握程度评分。
3. 打开扩展 Popup 查看今日复习计划。
4. 在题目页或 Popup 中写 Markdown 笔记。
5. 在设置页开启桌面提醒、配置周报邮箱、导出或导入备份。

<a id="roadmap"></a>

## Roadmap / 下一步优化方向

<table>
  <tr>
    <th>Direction</th>
    <th>Concrete Next Steps</th>
    <th>Expected Gain</th>
  </tr>
  <tr>
    <td><strong>IndexedDB Storage</strong><br />存储升级</td>
    <td>Split `problems`, `reviewLogs`, `notes`, and `settings`; add indexes for `nextReviewAt`, `updatedAt`, and `problemId`; keep JSON migration.</td>
    <td>Faster popup and safer growth when users reach hundreds or thousands of problems.</td>
  </tr>
  <tr>
    <td><strong>Review Analytics</strong><br />复习分析</td>
    <td>Build charts from existing ReviewLog data: weak tags, difficulty distribution, overdue trend, and repeated-lapse problems.</td>
    <td>Show not only what to review, but why those problems are risky.</td>
  </tr>
  <tr>
    <td><strong>Cloud Backup</strong><br />云端恢复</td>
    <td>Start with Chrome Sync for settings, then add WebDAV/Gist/Drive-style full backup with conflict preview.</td>
    <td>Recover data across devices without locking users into one backend.</td>
  </tr>
  <tr>
    <td><strong>AI Review Assistant</strong><br />AI 复盘</td>
    <td>Let users opt in to analyze selected notes and review logs; summarize mistakes and generate editable pattern notes.</td>
    <td>Turn scattered notes into structured review material without replacing user thinking.</td>
  </tr>
  <tr>
    <td><strong>Release Automation</strong><br />发布自动化</td>
    <td>Add GitHub Actions for typecheck, test, build, zip packaging, and release note draft.</td>
    <td>Ship Chrome extension releases with fewer manual mistakes.</td>
  </tr>
</table>

<a id="development"></a>

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
