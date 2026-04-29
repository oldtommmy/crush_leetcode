<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="120" height="120" />
  <h1>Crush LeetCode</h1>
  <p><strong>把刷过的题，真正变成会做的题。</strong></p>
  <p>一个面向 LeetCode 的 Chrome 扩展，用 FSRS 间隔重复、题目笔记和复习提醒，把“刷题数量”转化为“长期掌握”。</p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-0.0.1%20beta-ffb020?style=for-the-badge" alt="Version 0.0.1 beta" /></a>
    <img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3" />
    <img src="https://img.shields.io/badge/FSRS-ts--fsrs%205.3-blueviolet?style=for-the-badge" alt="ts-fsrs 5.3" />
    <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-red?style=for-the-badge" alt="License CC BY-NC 4.0" />
  </p>

  <p>
    <a href="#为什么需要它">为什么需要它</a> ·
    <a href="#已经实现">已经实现</a> ·
    <a href="#安装使用">安装使用</a> ·
    <a href="#下一步优化方向">下一步优化方向</a> ·
    <a href="#development">Development</a>
  </p>
</div>

---

## 为什么需要它

很多刷题工具只帮你记录“做过”。但真正影响面试表现的，往往是这些问题：

- 今天该复习哪几题，而不是又打开题库随机刷。
- 一道题是“真会了”，还是只是刚看完题解的短期记忆。
- 做题时的关键思路、坑点和模板能不能沉淀下来。
- 复习计划能不能自然融入 LeetCode 页面，而不是再维护一个额外表格。

Crush LeetCode 的目标很明确：在你 AC 之后立刻进入复习闭环，让每道题都有下一次出现的理由。

## 已经实现

### 1. AC 后自动进入复习流程

- 支持 `leetcode.com` 和 `leetcode.cn`。
- Content Script 会识别当前题目和 Accepted 提交结果。
- AC 后自动弹出评分面板，也可以通过题目页悬浮按钮手动评分。
- 同一道题当天已复习时会避免重复自动弹窗，减少打扰。

### 2. FSRS 驱动的复习调度

- 使用 `ts-fsrs@5.3.x`，不是简单的固定间隔表。
- 评分映射贴合算法题场景：`完全没思路`、`困难`、`一般`、`轻松`。
- 每次评分都会更新题目的 stability、difficulty、scheduled days、reps、lapses 等 FSRS 状态。
- 今日计划按可回忆度和逾期天数排序，优先把最容易遗忘的题推到前面。

### 3. Popup 今日计划和题库视图

- 展示今日剩余、今日完成、逾期数量、题库总量和近 7 天复习情况。
- 每道题可直接打开 LeetCode 原题、完成复习评分、归档不再复习。
- 支持“今日计划”和“全部题库”切换，适合日常复习和查找历史题。

### 4. Markdown 题目笔记

- 每道题都有独立 Markdown 笔记。
- 支持代码高亮预览，适合记录思路、复杂度、错因和模板。
- 题目页提供浮动笔记入口，刷题时不用离开当前页面。

### 5. 提醒和周报

- 支持每日桌面提醒，到点检查是否有待复习题。
- 支持官方邮件周报服务，将本周复习数量、新增 AC、逾期题目和 7 日趋势发送到邮箱。
- 周报有发送去重逻辑，避免未刷题时持续打扰。

### 6. 本地数据和备份

- 数据存储在 `chrome.storage.local`，包含题目、复习日志、笔记和用户设置。
- 设置页支持 JSON 导出和导入。
- 导入前会展示预览，包括题目数、笔记数、日志数、新增/覆盖数量和错误提示。

### 7. 双语和主题

- 支持中文和英文界面文案。
- 支持浅色、深色和跟随系统主题。

## 我们的优势

- 贴近真实刷题流程：不是独立 todo app，而是直接嵌入 LeetCode 题目页、提交结果和浏览器扩展弹窗。
- 复习计划更科学：FSRS 会根据你的主观反馈动态计算下一次复习时间，比固定 1/2/4/7 天更适合不同难度题目。
- 题目沉淀更完整：题目状态、复习日志、笔记、提醒和周报都围绕同一份本地数据工作。
- 打扰更少：同日复习去重、按需提醒、周报去重，让工具服务于复习节奏，而不是制造噪音。
- 可迁移：支持完整 JSON 备份和导入，避免数据被锁死在扩展里。
- 工程上可继续迭代：代码已经拆分为 content、popup、options、background、shared scheduler/storage/reminders，后续优化有明确落点。

## 截图

<div align="center">

| 评分弹窗 | 掌握度看板 |
|:---:|:---:|
| ![评分弹窗](./public/shots/rating-modal.png) | ![掌握度看板](./public/shots/dashboard.png) |

| Markdown 笔记 | 设置页面 |
|:---:|:---:|
| ![Markdown 笔记](./public/shots/notes.png) | ![设置页面](./public/shots/settings.png) |

</div>

## 安装使用

### 从 Release 安装

1. 打开 [Releases](https://github.com/oldtommmy/crush_leetcode/releases)，下载最新的 zip 包并解压。
2. 在 Chrome 地址栏打开 `chrome://extensions/`。
3. 开启右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的目录。

### 日常使用

1. 像平时一样在 LeetCode 做题并提交。
2. Accepted 后按真实掌握情况评分：完全没思路、困难、一般、轻松。
3. 打开浏览器扩展 Popup 查看今日复习计划。
4. 在题目页或 Popup 中写 Markdown 笔记。
5. 在设置页开启桌面提醒、配置周报邮箱、导出或导入备份。

## 下一步优化方向

这些不是泛泛而谈的愿望清单，而是可以直接拆任务落地的方向。

### 1. 存储升级到 IndexedDB

当前数据在 `chrome.storage.local` 中以整体状态存储，适合早期版本。随着题目、笔记和 ReviewLog 增长，可以升级为 IndexedDB。

- 用 Dexie 或轻量封装建立 `problems`、`reviewLogs`、`notes`、`settings` 四类表。
- 为 `nextReviewAt`、`updatedAt`、`problemId` 建索引，今日复习不再全量遍历。
- 保留现有 JSON 导入导出格式，增加一次性 migration。
- 预期收益：千题规模下 Popup 打开更快，日志统计更稳定。

### 2. 更强的复习分析看板

现在已有总题数、逾期数、今日完成和 7 日复习数据。下一步可以基于已有 ReviewLog 扩展分析。

- 按标签、难度、平台统计薄弱点。
- 展示 stability 分布、逾期趋势、复习完成率。
- 增加“最近经常遗忘的题”和“长期未复习但高风险题”。
- 预期收益：不只告诉你今天做什么，还告诉你为什么卡住。

### 3. 云同步和多设备恢复

当前已经支持本地 JSON 备份，云同步可以在这个基础上渐进实现。

- 第一阶段：Chrome Sync Storage 只同步设置和轻量索引。
- 第二阶段：WebDAV 或用户自有 GitHub Gist/Drive 作为完整备份目标。
- 第三阶段：实现冲突预览，沿用现有导入预览能力处理覆盖和合并。
- 预期收益：公司电脑、个人电脑和重装浏览器后都能继续复习链路。

### 4. AI 辅助复盘，但不替代思考

AI 能做的不是“帮你刷题”，而是基于你的笔记和复习历史做复盘辅助。

- 从 Markdown 笔记和 ReviewLog 中提取高频错因。
- 对同类题生成可编辑的模板总结。
- 在隐私可控的前提下，由用户主动选择要分析的题目和笔记。
- 预期收益：把零散笔记变成结构化复盘材料。

### 5. 更可靠的 LeetCode 页面适配

LeetCode 页面结构变化会影响 content script。后续可以继续加强检测策略。

- 为题目识别、提交状态识别和页面跳转增加更多测试样例。
- 把 DOM observer、页面 bridge 和 URL parser 的边界案例文档化。
- 增加可视化诊断面板，方便用户反馈“没有弹窗”的具体原因。
- 预期收益：减少平台改版带来的不可用风险。

### 6. 发布链路自动化

当前项目已有构建、测试和截图资产。发布可以进一步工程化。

- 增加 GitHub Actions：typecheck、test、build。
- 自动打包 `dist` 为 release zip。
- 根据 manifest 版本生成 release note 草稿。
- 预期收益：降低每次发版的人为失误。

## Development

### Tech Stack

- Chrome Extension Manifest V3
- React 18 + TypeScript
- Vite
- Tailwind CSS
- `ts-fsrs`
- Vitest

### Local Commands

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

### Project Structure

```text
src/background     Extension service worker, alarms, notifications, weekly digest
src/content        LeetCode page detection, AC observer, floating UI
src/options        Settings, reminders, email digest, import/export
src/popup          Daily plan, problem library, note editor
src/shared         Storage, FSRS scheduler, selectors, i18n, shared types
tests              Scheduler, selector, import, alarm and delivery tests
```

## License

This project is licensed under **CC BY-NC 4.0**. Non-commercial use only.

<div align="center">
  <p>如果 Crush LeetCode 对你有帮助，欢迎 Star 支持。</p>
  <img src="./public/icons/wechat-pay.png" alt="Sponsor" width="200" />
</div>
