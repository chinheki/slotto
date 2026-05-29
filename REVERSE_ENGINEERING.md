# Reverse Engineering

## 1. 当前功能列表

### Chrome 插件基础能力

- Manifest V3 Chrome Extension
- Popup UI
- Background service worker
- Content script
- 右键菜单入口
- 本地 build 后通过 `dist` 目录加载插件

### 日历界面

- 使用 React + FullCalendar 实现日历 UI
- 支持日视图、周视图、月视图
- 左侧竖向导航切换页面
- 设置页、日历页、候选时间生成页
- 支持紧凑、默认、大三种显示密度
- 月视图按天展示日程数量和状态色块
- 点击日期或日程可以在下方查看详情
- 日程详情支持前后切换
- 地点和会议链接可点击打开

### Google 日历能力

- 支持当前 Chrome 登录账号作为主账号
- 支持追加关联其他 Google 日历账号
- 读取多个 Google 日历账号的日程并合并显示
- 设置页显示已关联账号
- 支持解绑账号
- 支持清除本地日历缓存和授权状态
- 支持创建普通 Google 日历日程到主账号
- 支持编辑已确定 Google 日历日程，并同步回对应账号

### 候选时间生成

- 自动根据日历忙碌时间生成候选时间
- 支持每日可用时间带设置
- 支持避开周末和日本节假日
- 支持固定时长或最大空闲时间段
- 支持设置缓冲时间
- 支持设置生成数量，最大 10 个
- 支持手动在周视图中选择候选时间段
- 手动选择的时间段固定为整点或半点开始，长度 1 小时
- 选择后自动进入候选文本生成页面

### 多语言输出

- 支持日文、中文、英文候选时间文本
- 支持多选输出语言
- 支持复制生成文本
- 支持将生成文本插入当前网页输入框
- Popup UI 有基础 i18n 字典

### 占位日程

- 可以把候选时间写入主 Google 日历作为真实占位日程
- 占位日程标题带 `【Slotto占位】`
- 创建占位日程前弹窗填写标题和详情
- 占位日程会被未来候选时间生成逻辑视为忙碌时间
- 同一批占位日程共享 batch id
- 点击占位日程可以确认其中一个
- 确认后移除标题中的占位前缀，并删除同批次其他备选
- 可以删除同批次所有占位日程
- 可以批量编辑同批次占位日程的标题和详情

### 页面集成

- 支持在 Gmail / LinkedIn / BizReach / Green 页面注入 content script
- 支持右键选中文本后解析简单日期时间
- 支持将生成文本插入当前聚焦的 input、textarea 或 contenteditable 区域

### 本地数据

- 使用 `chrome.storage.sync` 保存设置、已关联账号、同步所有者、本地 pending events
- 使用 `chrome.storage.local` 保存日程缓存、授权状态、选中文本草稿
- 无 Chrome API 时 fallback 到 `localStorage`

## 2. 技术架构

```text
Chrome Extension
├── manifest.json
├── src/popup
│   ├── React Popup App
│   ├── FullCalendar 日历 UI
│   ├── 设置页
│   ├── 日历页
│   ├── 候选时间生成页
│   ├── 创建/编辑日程弹窗
│   └── 创建/编辑占位日程弹窗
│
├── src/background
│   ├── MV3 service worker
│   ├── Chrome contextMenus
│   └── 选中文本解析入口
│
├── src/content
│   └── 向当前网页可编辑区域插入文本
│
├── src/services
│   ├── scheduler.js      候选时间计算
│   ├── formatter.js      中日英时间格式化
│   ├── parser.js         简单文本时间解析
│   ├── dateTime.js       日期工具
│   ├── pending.js        pending 过期处理
│   ├── defaults.js       默认设置和 sample events
│   └── i18n.js           UI 文案字典
│
├── src/adapters
│   ├── chromeStorage.js  Chrome Storage 读写
│   └── googleCalendar.js Google Calendar API / OAuth
│
└── scripts
    ├── copy-extension-files.js
    └── smoke-test.js
```

### Frontend

- React 18
- Vite
- FullCalendar
- lucide-react icons
- 普通 CSS

### Extension APIs

- `chrome.identity`
- `chrome.identity.email`
- `chrome.storage`
- `chrome.contextMenus`
- `chrome.tabs`
- `chrome.action.openPopup`

### 外部集成

- Google Calendar API
- Google OAuth
- Google userinfo
- japanese-holidays

### 构建方式

```text
npm run build
├── vite build
└── node scripts/copy-extension-files.js
    ├── 注入 OAuth client id 到 dist/manifest.json
    └── 复制 background / content / services / adapters
```

## 3. 未完成部分

- Outlook Calendar 没有真实接入
- Gmail 内容解析没有实现，只支持右键选中文本的简单解析
- LinkedIn / BizReach / Green 也没有自动解析页面内容
- 没有 AI 解析邮件或候选时间
- 没有后端服务
- 没有 Web App 版本
- 没有团队共享日历
- 没有 Chrome Web Store 发布配置
- 没有正式 OAuth 审核相关流程
- 没有完整的刷新 token 机制
- 追加 Google 账号的授权依赖本地保存的 access token，过期后需要重新关联
- Outlook 设置项和 provider 类型存在，但没有 adapter
- `avoidBeforeHour` / `avoidAfterHour` / `avoidWorkHours` 在旧规则中存在，但主生成逻辑实际使用的是 `availabilityStartTime` / `availabilityEndTime`
- 文本解析只支持很有限的日期时间格式
- 日程编辑没有处理 recurring event 的复杂修改策略
- Google Calendar 写入会议链接目前只是追加到 description，并不是创建 Google Meet conference data

## 4. 风险点

- `README.md` 中仍写着 Calendar API integration 是 stub，这已经不符合当前实现。
- `.env` 存在于项目根目录，本地包含 OAuth client id，需确保不会提交敏感配置。
- 追加账号 access token 存在 `chrome.storage.local`，安全性和过期处理都比较粗糙。
- 使用 OAuth implicit flow 获取追加账号 access token，没有 refresh token，长期可用性弱。
- Google OAuth 如果未完成审核，非测试用户会遇到访问被阻止。
- 当前没有后端，跨设备只能同步设置和账号 metadata，日历授权与缓存需要每台设备重新处理。
- 日程缓存保存在本地，用户在 Google Calendar 外部修改后，需要重新拉取才能同步。
- 删除/确认占位日程是多次 API 调用，部分成功部分失败时缺少事务回滚。
- 创建占位日程也是逐个 API 调用，中途失败可能产生部分占位。
- 时区依赖浏览器和 Google Calendar 返回值，没有集中统一的 timezone policy。
- all-day event 被转换成 ISO datetime，可能出现显示或冲突计算偏差。
- 会议链接写入 description，后续再次编辑可能与用户原始详情混在一起。
- 测试覆盖很轻，只有 smoke test，没有 UI、OAuth、Calendar API mock 测试。
- `src/styles/popup.css` 像是旧版样式文件，目前 popup 使用的是 `src/popup/popup.css`，存在遗留文件风险。
- `AGENTS.md` 是空文件。
- `dist` 和 `node_modules` 在仓库目录中存在，容易和源码阅读混淆；是否应纳入版本管理需要确认。

## 5. 缺失文档

- OAuth 设置文档需要更新并单独成文，包含 Chrome Extension client、Web client、redirect URI、测试用户、常见错误。
- README 需要更新，移除“Calendar API stub”的过时说明。
- 需要一份 Google Calendar 数据模型文档，说明 event、placeholder、batch id、sourceAccountId 的关系。
- 需要一份授权与存储文档，说明哪些数据在 sync，哪些在 local，token 如何处理。
- 需要一份“占位日程状态机”文档，描述创建、编辑、确认、删除、外部修改后的行为。
- 需要一份错误处理与恢复文档，尤其是 API 部分失败、token 过期、账号解绑。
- 需要一份时区策略文档。
- 需要一份测试策略文档，明确 smoke test、单元测试、UI 测试、Calendar API mock 的范围。
- 需要一份发布前检查清单，包括 OAuth 审核、Chrome Web Store 权限说明、隐私政策。
- 需要清理或说明 `src/styles/popup.css`、`AGENTS.md`、`folder-alias.json`、`private-folder-alias.json` 的用途。
