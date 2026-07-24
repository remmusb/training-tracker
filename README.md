# 训练计划打卡 · 2026 晚间版

一周七练（推拉腿 + 跑步 + 足球）训练打卡网页：逐动作打卡、B站示范链接、饮食参考、体测记录与趋势图、Supabase 云同步多设备互通。

## 开启 GitHub Pages（一次性，约1分钟）

1. 打开仓库 **Settings → Pages**（左侧菜单）。
2. **Source** 选 `Deploy from a branch`。
3. **Branch** 选 `main`，目录选 `/ (root)`，点 **Save**。
4. 等 1–2 分钟，访问：**https://remmusb.github.io/training-tracker/**

手机浏览器打开后，可「添加到主屏幕」，当 App 用。

## 云同步配置（多设备数据互通）

打开页面 → 「📊 体测报告」→ 底部「☁️ 云同步」→ 展开「首次配置教程」，按步骤在 Supabase 建免费项目，把 Project URL 和 anon key 填入即可。每台设备填一次同样的值。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `index.html` | 页面结构与样式 |
| `data.js` | 训练计划 + 饮食数据（改计划改这里） |
| `app.js` | 打卡、体测、图表、云同步逻辑 |
