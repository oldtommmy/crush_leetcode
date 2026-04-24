<div align="center">
  <img src="./public/icons/icon.png" alt="Crush LeetCode Logo" width="120" height="120" />
  <h1>Crush LeetCode</h1>
  <p>让每一道 LeetCode 真正变成你的肌肉记忆 / Turn every LeetCode problem into muscle memory.</p>

  <p>
    <a href="#-中文说明">中文说明</a> | <a href="#-english">English</a> | <a href="https://github.com/oldtommmy/crush_leetcode/releases">Download</a>
  </p>

  <p>
    <a href="https://github.com/oldtommmy/crush_leetcode"><img src="https://img.shields.io/badge/GitHub-crush__leetcode-181717?style=for-the-badge&logo=github" alt="GitHub Repo" /></a>
    <a href="https://github.com/oldtommmy/crush_leetcode/releases"><img src="https://img.shields.io/badge/version-v0.0.1-ffb020?style=for-the-badge" alt="Version v0.0.1" /></a>
    <img src="https://img.shields.io/badge/Algorithm-FSRS--5.0-blueviolet?style=for-the-badge" alt="Algorithm FSRS 5.0" />
    <img src="https://img.shields.io/badge/License-CC%20BY--NC%204.0-red?style=for-the-badge" alt="License CC BY-NC 4.0" />
  </p>

</div>

---

## 📖 中文说明

### 简介
**Crush LeetCode** 是一款专为算法爱好者打造的浏览器扩展。它将先进的 **FSRS (Free Spaced Repetition Scheduler)** 算法引入刷题流程，帮助你科学地安排复习，彻底克服遗忘曲线。

### 🚀 核心功能

- **智能捕获**：适配 LeetCode 全球站 (.com) 与中国站 (.cn)，AC 后自动识别
- **FSRS 5.0 调度**：基于主观评分，动态计算下一次复习时间
- **掌握度系统**：题目自动归类为"陌生/熟悉/熟练/精通"，支持近 7 日复习趋势看板
- **Markdown 笔记**：每道题独立编辑器，沉淀解题思路
- **浮动笔记面板**：做题时随时记录，可拖拽定位
- **自动化周报**：支持定时推送美观的 HTML 统计周报（由官方代发服务提供支持）

### 🗺️ 路线图 / Roadmap

- [x] **FSRS 5.0** 间隔复习算法集成
- [x] **自动化周报**：每周进度动态直达邮箱
- [x] **Markdown 笔记**：沉淀每道题的解题思路
- [ ] **LLM 刷题深度分析**：接入大模型，分析你的代码风格与薄弱知识点，提供定制化复习建议
- [ ] **云端同步**：支持 Google Drive / WebDAV 或 Chrome Storage 云端存储，多设备无缝同步
- [ ] **社区激励**：刷题打卡看板与成就勋章系统
- [ ] **更多平台适配**：探索 Codeforces / LintCode 等平台的兼容性

### 📸 截图预览 / Screenshots

<div align="center">

| 评分弹窗 Rating Modal | 掌握度看板 Dashboard |
|:---:|:---:|
| ![评分弹窗](./public/shots/rating-modal.png) | ![掌握度看板](./public/shots/dashboard.png) |

| Markdown 笔记 Notes | 设置页面 Settings |
|:---:|:---:|
| ![Markdown笔记](./public/shots/notes.png) | ![设置页面](./public/shots/settings.png) |

</div>

### 🛠️ 安装步骤
1. **下载**: 前往 [Releases](https://github.com/oldtommmy/crush_leetcode/releases) 下载最新的 `crush_leetcode_v0.0.1.zip` 并解压。
2. **进入扩展页面**: 在 Chrome 浏览器地址栏输入 `chrome://extensions/` 并回车。
3. **开启开发者模式**: 点击页面右上角的“开发者模式”开关。
4. **加载程序**: 点击左上角的“加载已解压的扩展程序”，选择刚才解压出的文件夹。

### ⌨️ 使用指南
1. **刷题**: 像往常一样在 LeetCode 提交代码。
2. **评分**: 当获得 `Accepted` 结果时，页面会自动弹出评分面板。根据你的掌握情况选择“轻松/一般/困难/没思路”。
3. **复习**: 点击浏览器右上角的扩展图标（Popup），在“今日复习”列表中查看并完成到期的题目。
4. **笔记**: 在复习或刷题时，点击“笔记”按钮即可在侧边栏使用 Markdown 记录核心思路。

---

## 📖 English

### Introduction
**Crush LeetCode** is a browser extension for algorithm enthusiasts. It integrates the advanced **FSRS** algorithm into your LeetCode workflow, helping you schedule reviews scientifically and conquer the forgetting curve.

### 🚀 Core Features
- **Smart Detection**: Native support for leetcode.com and leetcode.cn with instant AC detection.
- **FSRS 5.0 Scheduling**: Dynamically calculates retrievability based on your feedback.
- **Mastery System**: Tracks problems through "New/Familiar/Proficient/Mastered" tiers with 7-day activity charts.
- **Markdown Notes**: Dedicated editor for every problem with syntax highlighting.
- **Automated Digest**: Elegant HTML weekly reports delivered via Official Relay service.

### 🗺️ Roadmap
- [x] **FSRS 5.0** Algorithm Integration
- [x] **Automated Weekly Digest** via email
- [x] **Markdown Notes** support
- [ ] **LLM AI Analysis**: Get deep insights into your coding patterns and personalized study plans via AI
- [ ] **Cloud Sync**: Multi-device synchronization via Google Drive, WebDAV, or Chrome Cloud Storage
- [ ] **Gamification**: Achievement system and contribution heatmaps
- [ ] **Cross-Platform**: Support for other competitive programming platforms (Codeforces, etc.)

### 🛠️ Installation
1. **Download**: Get the latest `.zip` archive from [Releases](https://github.com/oldtommmy/crush_leetcode/releases) and unzip it.
2. **Extensions Page**: Open Chrome and navigate to `chrome://extensions/`.
3. **Developer Mode**: Toggle on "Developer mode" in the top right corner.
4. **Load Unpacked**: Click "Load unpacked" and select the folder you just extracted.

---

## 🛡️ 开源协议 / License
本项目采用 **CC BY-NC 4.0** (署名-非商业性使用 4.0 国际) 协议。
Licensed under **CC BY-NC 4.0**. Non-commercial use only.

<div align="center">
  <p>如果你觉得这个项目对你有帮助，欢迎点个 <b>Star</b> ⭐</p>
  <img src="./public/icons/wechat-pay.png" alt="Sponsor" width="200" />
</div>
