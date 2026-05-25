<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="116" height="116" />

  <h1>Crush LeetCode</h1>

  <p><strong>把刷过的 LeetCode 题，真正变成会做的题。</strong></p>
  <p><strong>Turn solved LeetCode problems into long-term memory.</strong></p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-0.0.4%20beta.1-ffb020?style=for-the-badge" alt="Version 0.0.4 beta.1" /></a>
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

### 项目介绍

**Crush LeetCode** 是一款 Chrome 扩展，帮助你把 LeetCode 刷题变成一个更稳定的复习流程。

它会在你提交通过后记录题目，根据你的掌握程度安排下一次复习，并提供题目笔记、今日复习列表、完整题库、桌面提醒、周报和可选云同步能力。你不用再额外维护表格，也不用靠感觉猜今天该复习什么。

### v0.0.4 beta 更新重点

这一版重点围绕两件事：**做题后记录更稳**，以及**把大厂高频题接进你的本地题库**。

- 🧯 **v0.0.4 beta.1 热修已发布**：修复 v0.0.4 beta 中可能出现的题目页脚本异常，恢复 AC 后评分弹窗和自动入库。
- ✅ **LeetCode CN 提交识别更稳**：更准确地区分运行示例和正式提交，减少旧题弹窗、误判和漏记录。
- 🔥 **大厂高频题入口上线**：Popup 增加“复习 / 高频”切换，完整题库页也可以直接切到“大厂高频”。
- 🧭 **高频覆盖一眼看清**：按公司查看热门题，并结合你的本地题库展示哪些已做、哪些待补。
- 🛡️ **依然优先保护本地数据**：高频题只和浏览器里的本地题库做匹配，不上传你的题库、笔记、代码或复习记录。

### 核心功能

**🧠 自动记录与智能复习**

- ✅ **AC 后自动入库**：支持 `leetcode.com` 和 `leetcode.cn`，提交通过后自动弹出评分面板。
- 📆 **今日复习清单**：在 Popup 里查看今天该复习、已经完成、以及逾期未复习的题。
- 🪄 **更懂你的复习间隔**：根据每次掌握程度动态安排下一次复习，不再靠感觉猜。

**🔥 大厂高频与题库覆盖**

- 🏢 **按公司查看高频题**：快速浏览美团、字节、腾讯、阿里等公司高频题。
- 🎯 **只匹配你的本地题库**：展示哪些已经做过、哪些还没覆盖，不上传刷题历史。
- 🗂️ **完整题库 / 大厂高频一键切换**：在独立题库页查看筛选、掌握度、详情、笔记和高频覆盖。

**✍️ 笔记、提醒与数据管理**

- 📝 **每题独立 Markdown 笔记**：支持编辑、预览和本地导出，把思路沉淀在题目旁边。
- 🔔 **桌面提醒与复习周报**：到点提醒你复习，也可以配置邮箱接收一周进度。
- 📦 **导入导出更安心**：支持 JSON 备份和导入前预览，换设备或重装浏览器也不慌。
- ☁️ **可选云同步**：你主动开启后，才能用恢复码同步到云端快照。
- 🌗 **双语与主题**：支持中文 / English，以及浅色、深色、跟随系统主题。

### 为什么适合刷题复习

- **贴近 LeetCode 工作流**：直接运行在题目页、Popup 和设置页中，不需要切换到额外工具。
- **复习节奏更具体**：不是简单按固定天数提醒，而是根据每次掌握反馈调整间隔。
- **题库和笔记连在一起**：题目、评分、复习日志、掌握进度和 Markdown 笔记围绕同一道题沉淀。
- **数据可带走**：JSON 备份、Markdown 笔记导出和可选云同步，降低换设备或重装浏览器的成本。
- **持续更新更轻盈**：公告、版本提示和每日完成文案可以远程更新，重要信息不会错过。

### 截图

<div align="center">

  <p><strong>评分弹窗</strong></p>
  <img src="./public/shots/rating-modal.png" alt="评分弹窗" width="720" />

  <p><strong>掌握度看板</strong></p>
  <img src="./public/shots/dashboard.png" alt="掌握度看板" width="720" />

  <p><strong>Markdown 笔记</strong></p>
  <img src="./public/shots/notes.png" alt="Markdown 笔记" width="720" />

  <p><strong>设置页面</strong></p>
  <img src="./public/shots/settings.png" alt="设置页面" width="720" />

</div>

### 安装使用

1. 打开 [Releases](https://github.com/oldtommmy/crush_leetcode/releases)，下载最新的 zip 包并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 开启右上角 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**，选择解压后的目录。

### 使用流程

1. 在 LeetCode 正常做题并提交。
2. Accepted 后选择你的掌握程度：`完全没思路`、`困难`、`一般`、`轻松`。
3. 打开扩展 Popup 查看今日复习计划、高频推荐和官方公告。
4. 在题目页、Popup 或完整题库页记录 Markdown 笔记。
5. 在设置页配置提醒、周报邮箱、导入导出、笔记导出和可选云同步。

### 云同步说明

云同步是可选功能。开启后，扩展会在题目记录、笔记、复习状态等数据变化时尝试自动上传云端快照；你也可以在设置页手动上传或恢复。

- **恢复码由用户自己设置**：建议使用邮箱加一段私有后缀，例如 `name@example.com-crush-2026-private`。
- **恢复码需要记住**：恢复数据时必须输入同一个恢复码，插件和服务端不会保存明文恢复码。
- **避免过短或过常见**：恢复码太简单会增加碰撞和误恢复风险。
- **同步的是快照**：当前版本以整体数据快照为主，后续会继续优化冲突合并和端到端加密体验。

### 后续优化方向

- **更大的本地题库容量**：让大量题目、日志和笔记也能保持顺滑。
- **更安心的同步体验**：继续优化恢复流程、冲突处理和数据保护。
- **更直观的复习分析**：展示薄弱标签、逾期趋势和容易忘的题。
- **更顺手的高频题体验**：补充更多筛选、覆盖视图和复习建议。

---

## English

### Project Introduction

**Crush LeetCode** is a Chrome extension that helps you turn LeetCode practice into a repeatable review system.

After you submit an accepted solution, it records the problem, schedules the next review based on your mastery level, and provides problem notes, today's review list, a full problem library, desktop reminders, weekly reports, and optional cloud sync. You no longer need to maintain a separate spreadsheet or guess what to review today by feel.

### v0.0.4 beta Highlights

This release focuses on two things: **more reliable problem capture** and **company hot questions inside your local library**.

- 🧯 **v0.0.4 beta.1 hotfix is available**: Fixes a v0.0.4 beta issue that could break the problem-page script, restoring Accepted popups and automatic library insertion.
- ✅ **More reliable LeetCode CN submission detection**: Better separates sample runs from real submissions, reducing stale popups, missed records, and false triggers.
- 🔥 **Company hot questions are here**: The popup now has Review / Hot tabs, and the full library can switch directly to Company Hot List.
- 🧭 **Coverage at a glance**: Browse hot questions by company and see what you have already solved locally.
- 🛡️ **Local-first by default**: Hot questions are matched only against your browser-local library. Your problems, notes, code, and review logs are not uploaded.

### Core Features

**🧠 Auto Capture and Smart Review**

- ✅ **Accepted submissions are saved automatically**: Supports `leetcode.com` and `leetcode.cn`, with a rating panel after each accepted submission.
- 📆 **Today's review list**: See due, completed, and overdue problems directly in the popup.
- 🪄 **A review rhythm that adapts to you**: Next review dates change with your mastery feedback instead of fixed reminders.

**🔥 Company Hot Questions and Coverage**

- 🏢 **Browse hot questions by company**: Quickly scan popular questions from companies such as Meituan, ByteDance, Tencent, and Alibaba.
- 🎯 **Matched only with your local library**: See what you have solved and what is still uncovered without uploading your practice history.
- 🗂️ **Full Library / Company Hot List switch**: Use the standalone library page for filters, mastery, details, notes, and hot-list coverage.

**✍️ Notes, Reminders, and Data Control**

- 📝 **Per-problem Markdown notes**: Edit, preview, and export your thinking right next to each problem.
- 🔔 **Desktop reminders and weekly reports**: Get timely review reminders and optional weekly email summaries.
- 📦 **Safer import and export**: Back up JSON data and preview changes before importing.
- ☁️ **Optional cloud sync**: Sync to cloud snapshots only after you opt in, using your own recovery code.
- 🌗 **Bilingual and theme support**: Chinese / English, plus light, dark, and system themes.

### Why It Fits LeetCode Review

- **Close to the LeetCode workflow**: It runs directly on problem pages, the popup, and Settings, so you do not need to switch to another tool.
- **A more concrete review rhythm**: It does not simply remind you after fixed intervals; it adjusts the interval based on your mastery feedback each time.
- **The library and notes stay connected**: Problems, ratings, review logs, mastery progress, and Markdown notes all accumulate around the same problem.
- **Your data can move with you**: JSON backup, Markdown note export, and optional cloud sync reduce the cost of changing devices or reinstalling the browser.
- **Updates feel lighter**: Announcements, version notices, and daily completion messages can be refreshed remotely, so important information reaches you faster.

### Screenshots

<div align="center">

  <p><strong>Rating Modal</strong></p>
  <img src="./public/shots/rating-modal.png" alt="Rating Modal" width="720" />

  <p><strong>Dashboard</strong></p>
  <img src="./public/shots/dashboard.png" alt="Dashboard" width="720" />

  <p><strong>Markdown Notes</strong></p>
  <img src="./public/shots/notes.png" alt="Markdown Notes" width="720" />

  <p><strong>Settings</strong></p>
  <img src="./public/shots/settings.png" alt="Settings" width="720" />

</div>

### Installation and Usage

1. Download the latest zip from [Releases](https://github.com/oldtommmy/crush_leetcode/releases) and unzip it.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extracted folder.

### Usage Flow

1. Solve and submit problems on LeetCode as usual.
2. After Accepted, choose your mastery level: `No clue`, `Hard`, `Normal`, or `Too easy`.
3. Open the extension popup to review today's plan, hot recommendations, and official announcements.
4. Write Markdown notes from the problem page, popup, or full library page.
5. Configure reminders, weekly digest email, import/export, notes export, and optional cloud sync from the settings page.

### Cloud Sync Notes

Cloud sync is optional. Once enabled, the extension tries to upload a cloud snapshot after key local data changes. You can also upload or restore manually from Settings.

- **The recovery code is set by the user**: An email plus a private suffix is recommended, for example `name@example.com-crush-2026-private`.
- **The recovery code must be remembered**: Restoring data requires the same code. The extension and service do not store the plaintext recovery code.
- **Avoid short or common codes**: Weak codes increase collision and accidental-restore risk.
- **Sync currently uses snapshots**: This version mainly syncs whole data snapshots. Conflict merging and end-to-end encryption will continue to improve later.

### Future Optimization Directions

- **Roomier local storage**: Keep large libraries, logs, and notes smooth over time.
- **More reassuring sync**: Improve restore flows, conflict handling, and data protection.
- **Clearer review analytics**: Surface weak tags, overdue trends, and problems you often forget.
- **Better hot-list workflows**: Add richer filters, coverage views, and review suggestions.

---

## Development

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

### Environment

Runtime service endpoints and cloud-sync credentials are provided through local environment files during development and build. Do not commit real deployment details, service keys, or private operational notes to the public repository.

Optional build-time endpoints:

- `VITE_CRUSH_CODETOP_BASE_URL`: CodeTop metadata API base URL. Defaults to `https://mail.crushlc.site/codetop`.

### Project Layout

- `src/background`: service worker, alarms, notifications, announcements, sync triggers, weekly digest.
- `src/content`: LeetCode page detection, Accepted observer, and floating UI.
- `src/options`: Settings, reminders, email digest, import/export, library entry, and cloud sync.
- `src/popup`: daily plan, compact library, hot questions, and note editor.
- `src/library`: standalone full library and company hot-list views.
- `src/shared`: storage, scheduler, selectors, i18n, sync, shared UI, and types.
- `tests`: scheduler, selector, import, alarm, announcement, and delivery coverage.

## License

Licensed under **CC BY-NC 4.0**. Non-commercial use only.

<div align="center">
  <p><strong>If Crush LeetCode helps you, a Star means a lot.</strong></p>
  <p><strong>如果这个项目对你有帮助，欢迎 Star 支持。</strong></p>
  <img src="./public/icons/wechat-pay.png" alt="Sponsor" width="200" />
</div>
