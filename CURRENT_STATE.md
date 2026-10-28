# Current State

## 现在做到哪了？

## 已完成

✅ Chrome Extension 初始化

✅ 插件显示名已简化为 Slotto

✅ 已新增手机优先的 Web App 目录 `web/`

✅ Web App 复用候选时间生成和多语言格式化服务

✅ Web App 已支持 PWA manifest、主屏幕图标和生产环境 service worker

✅ Web App 主界面已合并日历与备选时间

✅ Web App 主界面已放入候选时间生成条件和回复语言选择

✅ Web App 设置页已调整为网页语言和账号状态设置

✅ Web App 已接入第一阶段无后端 Google Web OAuth，占位 client ID 通过环境变量替换

✅ Web App 可将已关联 Google 日历日程读入日历和候选时间计算

✅ Google 全天日程已按 date-only 和独占结束日期处理，避免单日全天日程显示成两天

✅ Google 日程缓存已按账号和 googleEventId 去重，避免全天/非全天切换后显示重复日程

✅ 日历页已增加硬刷新按钮，可按账号重新拉取 Google 日程；刷新失败账号会保留旧缓存避免日程消失

✅ React Popup UI

✅ 日历页、设置页、候选时间生成页

✅ 日 / 周 / 月日历视图

✅ Google OAuth 主账号登录

✅ 追加 Google 日历账号关联

✅ 读取 Google 日历日程

✅ 多个 Google 日历账号的日程合并显示

✅ 设置页显示已关联账号并支持解绑

✅ 设置页支持对需要重连的副 Google 日历账号单独重新关联

✅ 手动选择候选时间段

✅ 手动选择时间段时允许选择已有日程占用的时间，作为用户主动 override

✅ 点击选择时间段时进入空白周视图，由用户手动选择候选时间

✅ 自动计算可用时间

✅ 随机生成候选时间

✅ 候选时间开始分钟固定为 0 或 30

✅ 候选时长按 30 分钟单位选择

✅ 支持缓冲时间、每日时间带、周末和日本节假日过滤

✅ 生成中文 / 日文 / 英文候选时间文本

✅ 创建占位日程到主 Google 日历

✅ 创建占位日程后保留当前候选时间文本，直到用户再次随机生成

✅ 占位日程支持标题和详情

✅ 确定一个占位日程后删除同批次其他备选

✅ 删除一批占位日程

✅ 批量编辑同一批占位日程的标题和详情

✅ 创建普通 Google 日历日程

✅ 编辑已确定 Google 日历日程并同步回对应账号

✅ 右键菜单入口

✅ 将生成文本插入当前网页输入框

✅ 日程开始前可通过 macOS 系统通知提醒，并在支持的网站右上角显示跳动的像素人物气泡

✅ 设置页可开关日程提醒、选择提前 5/10/15/30/60 分钟，并可安排 10 秒后触发的测试提醒

✅ 提醒吉祥物已替换为用户提供的深色头发像素人物

✅ 系统通知使用完整扩展资源 URL 加载人物图标，并在加载失败时回退到 Slotto 图标

✅ 基础 i18n

✅ 已生成 4 个 SVG 图标方案

✅ 已将第 3 个方案导出为 PNG 并配置为当前插件图标

✅ 本地 build 和 smoke test

## 进行中

🚧 多账号授权体验完善

🚧 追加账号的长期授权和过期处理

🚧 Web App 多账号重连、token 过期处理和后续写入 Google Calendar

🚧 日程详情编辑体验优化

🚧 候选时间生成规则细化

🚧 UI 细节和异常状态打磨

## 未开始

❌ Outlook Calendar 接入

❌ Gmail 内容解析

❌ 自动识别招聘邮件

❌ AI 解析候选时间

❌ 后端服务

❌ 团队共享日历

❌ 移动端

❌ 面试流程 CRM

## 当前问题

- 当前没有独立后端，跨设备共享依赖 Chrome 同步和本地重新授权。
- 追加 Google 账号的 access token 保存在本地，过期后需要重新关联。
- Web App 第一阶段已使用独立 Google Web OAuth；网页版和 Chrome Extension 不共享授权 token，其他账号需要在网页版重新关联。
- Web App 第二阶段计划加入 Firebase DB，同步 Slotto 用户、已关联日历账号关系和跨设备状态。
- Outlook Calendar 目前只是规划项，还没有真实接入。
- Gmail / LinkedIn / BizReach 等页面目前主要支持文本插入和右键入口，还没有做内容自动解析。
- 时区处理主要依赖浏览器和 Google Calendar 返回值，尚未做完整统一策略。
- 多日历冲突判断已能避开已有日程，但更复杂的优先级、紧急程度和颜色分类还未实现。
- Google OAuth 仍处于开发/测试应用形态，正式发布前需要处理 Google 审核。
- 当前主要是本地加载插件，尚未发布到 Chrome Web Store。
- Web App 当前是本地浏览器版本，使用 localStorage 保存 Web OAuth access token，还没有后端同步。

## Handoff — 2026-10-28 UTC 本机备份

- 本次交接保存此前未提交的扩展与 Web App 工作：Google 日历全天事件映射和刷新、候选时段交互、额外账号重连、日程提醒与人物素材、Slotto 图标、移动端 Web/PWA 壳及配套文档。以上为现有本地实现，本次备份没有新增功能。
- 2026-10-28 重新执行 `npm run build`、`npm test`、`npm run web:build`，全部通过。仅为构建和非浏览器 smoke test；未重新完成浏览器、真实 Google OAuth、日历写入、通知或真机验收，也没有部署。
- 接手先读 PROJECT.md、本文和 TASKS.md。README 仍含早期 MVP/stub 描述，实际进度以本文及代码为准；继续处理 token 过期、多账号授权、日历写入失败恢复和时区策略等已有待办。
- `.env` 是本机 OAuth 配置，未提交；`dist/`、`web-dist/` 与 `node_modules/` 未推送。本机完整归档另行保留这些内容，GitHub 克隆本身不包含它们。恢复开发需安全取回本机配置或按 `.env.example` 重建。
- 本次只做源码和交接备份；没有发布 Chrome Web Store、Web 服务或清理本地目录。
