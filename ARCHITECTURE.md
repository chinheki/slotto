# Architecture

## 系统长什么样？

当前项目是一个本地运行的 Chrome Extension，没有独立后端。

```text
Chrome Extension
├── Popup UI
│   ├── React
│   ├── FullCalendar
│   ├── 设置页
│   ├── 日历页
│   └── 候选时间生成页
│
├── Background
│   ├── Chrome MV3 service worker
│   └── 右键菜单入口
│
├── Content Script
│   ├── 向当前网页输入框插入生成文本
│   └── 支持 Gmail / LinkedIn / BizReach / Green 页面注入
│
├── Services
│   ├── 时间段生成逻辑
│   ├── 可用时间过滤规则
│   ├── 多语言格式化
│   ├── 日程解析
│   └── 日本节假日过滤
│
├── Adapters
│   ├── Chrome Storage
│   ├── Chrome Identity OAuth
│   └── Google Calendar API
│
└── Local Storage
    ├── 用户设置
    ├── 已关联日历账号信息
    ├── 日历授权状态
    ├── 缓存的日程数据
    └── 本地待处理日程
```

## Frontend

```text
Frontend
├── React
├── Vite
├── FullCalendar
├── lucide-react icons
└── Chrome Extension popup UI
```

## Backend

```text
Backend
└── 无独立后端
```

当前版本的数据主要保存在 Chrome Storage 中：

- `chrome.storage.sync`：设置、已关联账号信息、同步所有者
- `chrome.storage.local`：日程缓存、授权状态、本地草稿

## Integration

```text
Integration
├── Google Calendar API
├── Chrome Identity
├── Chrome Storage
├── Chrome Context Menu
├── Gmail
├── LinkedIn
├── BizReach
└── Green
```

## Build

```text
Build
├── Vite
├── npm scripts
└── dist 作为 Chrome Load unpacked 目录
```
