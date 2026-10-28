// Mobile-first Slotto web app shell with calendar planning, candidate rules
// on the main page, and global language/account settings on a separate page.
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Plus, RefreshCw, Settings, Share2, Trash2 } from 'lucide-react';
import appIcon from '../../assets/icons/icon-128.png';
import { defaultSettings, sampleBusyEvents } from '../../src/services/defaults.js';
import { formatSlots } from '../../src/services/formatter.js';
import { generateAvailability } from '../../src/services/scheduler.js';
import { connectGoogleCalendarWeb, fetchGoogleCalendarWebEvents, hasConfiguredGoogleWebClient } from './services/googleCalendarWeb.js';
import { registerPwa } from './pwa.js';
import './styles.css';

const STORAGE_KEY = 'slotto:web:v1';
const languages = [
  ['ja', '日本語'],
  ['zh', '中文'],
  ['en', 'English']
];
const durationOptions = [30, 60, 90, 120, 150, 180, 210, 240];
const countOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const bufferOptions = [0, 15, 30, 45, 60, 90, 120];
const weekdayLabels = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  zh: ['日', '一', '二', '三', '四', '五', '六']
};
const copy = {
  en: {
    pageTitle: 'Candidate times',
    randomGenerate: 'Random generate',
    calendar: 'Calendar',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    noItems: 'No items for this day.',
    rules: 'Rules',
    from: 'From',
    to: 'To',
    duration: 'Duration',
    buffer: 'Buffer',
    count: 'Count',
    avoidHolidays: 'Avoid weekends and JP holidays',
    outputLanguages: 'Reply languages',
    candidateTimes: 'Candidate times',
    addCandidate: 'Add candidate',
    date: 'Date',
    time: 'Time',
    reply: 'Reply',
    copy: 'Copy',
    share: 'Share',
    placeholders: 'Placeholders',
    title: 'Title',
    details: 'Details',
    createPlaceholders: 'Create placeholders',
    confirm: 'Confirm',
    delete: 'Delete',
    remove: 'Remove',
    settings: 'Settings',
    back: 'Back',
    webLanguage: 'Web language',
    accounts: 'Accounts',
    localSession: 'Local web session',
    active: 'Active',
    googleCalendar: 'Google Calendar',
    notConnected: 'Not connected',
    connectSoon: 'Web OAuth is ready after setting a client ID.',
    connectGoogle: 'Connect Google',
    addGoogleAccount: 'Add account',
    refreshCalendars: 'Hard refresh',
    disconnect: 'Disconnect',
    connected: 'Connected',
    reconnectRequired: 'Reconnect required',
    missingClientId: 'Set VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID first.',
    connecting: 'Connecting...',
    refreshing: 'Refreshing...',
    syncedEvents: 'Synced events.',
    plan: 'Plan',
    generated: 'Generated candidate times.',
    overlap: 'This time overlaps another item.',
    added: 'Added candidate time.',
    copied: 'Copied.',
    createdPlaceholders: 'Created local placeholders.',
    confirmed: 'Confirmed one time and removed the other options.',
    deletedPlaceholders: 'Deleted placeholder options.'
  },
  ja: {
    pageTitle: '候補時間',
    randomGenerate: 'ランダム生成',
    calendar: 'カレンダー',
    previousMonth: '前の月',
    nextMonth: '次の月',
    noItems: 'この日の予定はありません。',
    rules: '条件',
    from: '開始',
    to: '終了',
    duration: '長さ',
    buffer: '間隔',
    count: '件数',
    avoidHolidays: '週末と日本の祝日を避ける',
    outputLanguages: '返信言語',
    candidateTimes: '候補時間',
    addCandidate: '候補を追加',
    date: '日付',
    time: '時間',
    reply: '返信',
    copy: 'コピー',
    share: '共有',
    placeholders: '仮予定',
    title: 'タイトル',
    details: '詳細',
    createPlaceholders: '仮予定を作成',
    confirm: '確定',
    delete: '削除',
    remove: '削除',
    settings: '設定',
    back: '戻る',
    webLanguage: '表示言語',
    accounts: 'アカウント',
    localSession: 'ローカルセッション',
    active: '有効',
    googleCalendar: 'Google カレンダー',
    notConnected: '未連携',
    connectSoon: 'クライアント ID 設定後に Web OAuth を利用できます',
    connectGoogle: 'Google 連携',
    addGoogleAccount: 'アカウント追加',
    refreshCalendars: '強制更新',
    disconnect: '解除',
    connected: '連携済み',
    reconnectRequired: '再連携が必要',
    missingClientId: 'VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID を設定してください。',
    connecting: '連携中...',
    refreshing: '更新中...',
    syncedEvents: '予定を同期しました。',
    plan: '予定',
    generated: '候補時間を生成しました。',
    overlap: '他の予定と重なっています。',
    added: '候補時間を追加しました。',
    copied: 'コピーしました。',
    createdPlaceholders: 'ローカル仮予定を作成しました。',
    confirmed: '1件を確定し、他の候補を削除しました。',
    deletedPlaceholders: '仮予定候補を削除しました。'
  },
  zh: {
    pageTitle: '候选时间',
    randomGenerate: '随机生成',
    calendar: '日历',
    previousMonth: '上个月',
    nextMonth: '下个月',
    noItems: '这一天没有日程。',
    rules: '生成条件',
    from: '开始',
    to: '结束',
    duration: '时长',
    buffer: '缓冲',
    count: '数量',
    avoidHolidays: '避开周末和日本节假日',
    outputLanguages: '回复语言',
    candidateTimes: '候选时间',
    addCandidate: '追加候选',
    date: '日期',
    time: '时间',
    reply: '回复',
    copy: '复制',
    share: '分享',
    placeholders: '占位日程',
    title: '标题',
    details: '详情',
    createPlaceholders: '生成占位日程',
    confirm: '确定',
    delete: '删除',
    remove: '删除',
    settings: '设置',
    back: '返回',
    webLanguage: '网页语言',
    accounts: '账号',
    localSession: '本地网页会话',
    active: '可用',
    googleCalendar: 'Google 日历',
    notConnected: '未关联',
    connectSoon: '设置 client ID 后可使用 Web OAuth',
    connectGoogle: '关联 Google',
    addGoogleAccount: '追加账号',
    refreshCalendars: '硬刷新',
    disconnect: '解绑',
    connected: '已关联',
    reconnectRequired: '需要重新关联',
    missingClientId: '请先设置 VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID。',
    connecting: '关联中...',
    refreshing: '刷新中...',
    syncedEvents: '已同步日程。',
    plan: '计划',
    generated: '已生成候选时间。',
    overlap: '这个时间和其他日程重叠。',
    added: '已追加候选时间。',
    copied: '已复制。',
    createdPlaceholders: '已生成本地占位日程。',
    confirmed: '已确定一个时间，并删除其他候选。',
    deletedPlaceholders: '已删除占位候选。'
  }
};

registerPwa();

function App() {
  const [settings, setSettings] = usePersistentState('settings', {
    ...defaultSettings,
    outputLanguages: ['ja', 'zh'],
    calendars: { google: true, outlook: false }
  });
  const [busyEvents, setBusyEvents] = usePersistentState('busyEvents', sampleBusyEvents);
  const [webAccounts, setWebAccounts] = usePersistentState('webAccounts', []);
  const [slots, setSlots] = usePersistentState('slots', []);
  const [placeholders, setPlaceholders] = usePersistentState('placeholders', []);
  const [draft, setDraft] = useState(() => getDefaultDraft());
  const [placeholderForm, setPlaceholderForm] = useState({ title: '面接', description: '' });
  const [activePage, setActivePage] = useState('plan');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [notice, setNotice] = useState('');
  const [accountLoading, setAccountLoading] = useState('');

  useEffect(() => {
    if (!slots.length) {
      setSlots(buildSlots(settings, busyEvents, placeholders));
    }
  }, []);

  useEffect(() => {
    const nextBusyEvents = dedupeCalendarEvents(busyEvents);
    if (nextBusyEvents.length !== busyEvents.length) {
      setBusyEvents(nextBusyEvents);
      setSlots(buildSlots(settings, nextBusyEvents, placeholders));
    }
  }, [busyEvents, placeholders, settings, setBusyEvents, setSlots]);

  const outputLanguages = settings.outputLanguages?.length ? settings.outputLanguages : [settings.language];
  const t = copy[settings.language] ?? copy.en;
  const weekdays = weekdayLabels[settings.language] ?? weekdayLabels.en;
  const googleClientConfigured = hasConfiguredGoogleWebClient();
  const responseText = useMemo(() => outputLanguages.map((language) => formatSlots(slots, language)).join('\n\n'), [outputLanguages, slots]);
  const timelineEvents = useMemo(() => [...busyEvents, ...placeholders, ...slots.map(slotToCandidateEvent)].sort(byStart), [busyEvents, placeholders, slots]);
  const monthDays = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const selectedDayEvents = useMemo(() => timelineEvents.filter((event) => isSameLocalDate(new Date(event.start), selectedDate)), [timelineEvents, selectedDate]);

  function updateSettings(patch) {
    setSettings((current) => ({
      ...current,
      ...patch,
      rules: {
        ...current.rules,
        ...(patch.rules ?? {})
      }
    }));
  }

  function randomGenerate() {
    const nextSlots = buildSlots(settings, busyEvents, placeholders);
    setSlots(nextSlots);
    setNotice(`${t.generated} (${nextSlots.length})`);
  }

  function toggleLanguage(language, checked) {
    const nextLanguages = checked
      ? [...new Set([...outputLanguages, language])]
      : outputLanguages.filter((item) => item !== language);
    updateSettings({ outputLanguages: nextLanguages.length ? nextLanguages : [language] });
  }

  function addDraftSlot() {
    const start = localDateTimeToIso(draft.date, draft.time);
    const end = new Date(new Date(start).getTime() + settings.slotDurationMinutes * 60000).toISOString();
    const slot = { id: `${start}_${end}`, start, end };
    if (hasOverlap(slot, [...busyEvents, ...placeholders, ...slots])) {
      setNotice(t.overlap);
      return;
    }
    setSlots((current) => [...current, slot].sort(byStart));
    setNotice(t.added);
  }

  function removeSlot(slotId) {
    setSlots((current) => current.filter((slot) => slot.id !== slotId));
  }

  async function copyResponse() {
    await navigator.clipboard.writeText(responseText);
    setNotice(t.copied);
  }

  async function shareResponse() {
    if (navigator.share) {
      await navigator.share({ text: responseText });
      return;
    }
    await copyResponse();
  }

  function createLocalPlaceholders() {
    if (!slots.length || !placeholderForm.title.trim()) {
      return;
    }
    const batchId = crypto.randomUUID();
    const created = slots.map((slot) => ({
      ...slot,
      id: `local-placeholder-${batchId}-${slot.id}`,
      provider: 'local',
      title: placeholderForm.title.trim(),
      status: 'pending',
      details: {
        description: placeholderForm.description.trim(),
        placeholderBatchId: batchId,
        isSlottoPlaceholder: true
      }
    }));
    setPlaceholders((current) => [...current, ...created].sort(byStart));
    setNotice(`${t.createdPlaceholders} (${created.length})`);
  }

  function confirmPlaceholder(event) {
    const batchId = event.details?.placeholderBatchId;
    setPlaceholders((current) => current.filter((item) => item.id === event.id || item.details?.placeholderBatchId !== batchId));
    setBusyEvents((current) => [...current, { ...event, status: 'confirmed', id: `confirmed-${event.id}` }].sort(byStart));
    setNotice(t.confirmed);
  }

  function deletePlaceholderBatch(event) {
    const batchId = event.details?.placeholderBatchId;
    setPlaceholders((current) => current.filter((item) => item.details?.placeholderBatchId !== batchId));
    setNotice(t.deletedPlaceholders);
  }

  function selectCalendarDate(date) {
    setSelectedDate(date);
    setDraft((current) => ({
      ...current,
      date: dateToInputValue(date)
    }));
  }

  function moveMonth(direction) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  async function connectWebGoogleAccount() {
    if (!googleClientConfigured) {
      setNotice(t.missingClientId);
      return;
    }

    setAccountLoading('connect');
    const result = await connectGoogleCalendarWeb();
    setAccountLoading('');

    if (!result.ok) {
      setNotice(result.message);
      return;
    }

    setWebAccounts((current) => upsertAccount(current, result.account));
    const nextBusyEvents = mergeGoogleEvents(busyEvents, result.account.id, result.events);
    setBusyEvents(nextBusyEvents);
    setSlots(buildSlots(settings, nextBusyEvents, placeholders));
    setNotice(`${t.syncedEvents} (${result.events.length})`);
  }

  async function refreshWebGoogleCalendars() {
    if (!webAccounts.length) {
      return;
    }

    setAccountLoading('refresh');
    const refreshedAccounts = [];
    const refreshedEvents = [];

    for (const account of webAccounts) {
      const result = await fetchGoogleCalendarWebEvents({ account });
      if (!result.ok) {
        refreshedAccounts.push({ ...account, status: 'reconnect-required', lastError: result.message });
        continue;
      }

      refreshedAccounts.push({
        ...account,
        status: 'connected',
        lastError: '',
        lastSyncedAt: new Date().toISOString(),
        eventCount: result.events.length
      });
      refreshedEvents.push(...result.events);
    }

    setAccountLoading('');
    setWebAccounts(refreshedAccounts);
    const nextBusyEvents = mergeAllGoogleEvents(busyEvents, refreshedEvents);
    setBusyEvents(nextBusyEvents);
    setSlots(buildSlots(settings, nextBusyEvents, placeholders));
    setNotice(`${t.syncedEvents} (${refreshedEvents.length})`);
  }

  function disconnectWebGoogleAccount(accountId) {
    setWebAccounts((current) => current.filter((account) => account.id !== accountId));
    setBusyEvents((current) => current.filter((event) => event.sourceAccountId !== accountId));
  }

  return (
    <main className="app">
      <header className="hero">
        <div className="brand">
          <img src={appIcon} alt="" />
          <div>
            <p>Slotto</p>
            <h1>{t.pageTitle}</h1>
          </div>
        </div>
        <div className="actions">
          <button className="iconButton" onClick={randomGenerate} aria-label={t.randomGenerate}>
            <RefreshCw size={18} />
          </button>
          <button className="iconButton" onClick={() => setActivePage('settings')} aria-label={t.settings}>
            <Settings size={18} />
          </button>
        </div>
      </header>

      {activePage === 'plan' ? (
        <>
          <section className="panel calendarPanel">
            <div className="sectionHeader">
              <div className="sectionTitle">
                <CalendarDays size={18} />
                <h2>{formatMonthTitle(visibleMonth, settings.language)}</h2>
              </div>
              <div className="actions">
                <button className="ghostIcon" onClick={() => moveMonth(-1)} aria-label={t.previousMonth}><ChevronLeft size={16} /></button>
                <button className="ghostIcon" onClick={() => moveMonth(1)} aria-label={t.nextMonth}><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="calendarGrid weekdays">
              {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
            </div>
            <div className="calendarGrid">
              {monthDays.map((day) => {
                const dayEvents = timelineEvents.filter((event) => isSameLocalDate(new Date(event.start), day.date));
                return (
                  <button
                    key={day.date.toISOString()}
                    className={`dayCell ${day.isCurrentMonth ? '' : 'mutedDay'} ${isSameLocalDate(day.date, selectedDate) ? 'selected' : ''}`}
                    onClick={() => selectCalendarDate(day.date)}
                  >
                    <span>{day.date.getDate()}</span>
                    <div className="dayDots">
                      {dayEvents.slice(0, 3).map((event) => <i key={event.id} className={event.status ?? 'candidate'} />)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="dayAgenda">
              <strong>{formatDayTitle(selectedDate, settings.language)}</strong>
              {selectedDayEvents.length ? selectedDayEvents.map((event) => (
                <p key={event.id}>{event.title} · {formatSlots([event], settings.language)}</p>
              )) : <p>{t.noItems}</p>}
            </div>
          </section>

          <section className="panel settingsPanel">
            <div className="sectionHeader">
              <h2>{t.rules}</h2>
              <button className="secondaryButton compact" onClick={randomGenerate}>{t.randomGenerate}</button>
            </div>
            <div className="grid two">
              <label>
                <span>{t.from}</span>
                <input type="time" value={settings.availabilityStartTime} onChange={(event) => updateSettings({ availabilityStartTime: event.target.value })} />
              </label>
              <label>
                <span>{t.to}</span>
                <input type="time" value={settings.availabilityEndTime} onChange={(event) => updateSettings({ availabilityEndTime: event.target.value })} />
              </label>
              <label>
                <span>{t.duration}</span>
                <select value={settings.slotDurationMinutes} onChange={(event) => updateSettings({ slotDurationMinutes: Number(event.target.value) })}>
                  {durationOptions.map((value) => <option key={value} value={value}>{value} min</option>)}
                </select>
              </label>
              <label>
                <span>{t.buffer}</span>
                <select value={settings.rules.addBufferMinutes} onChange={(event) => updateSettings({ rules: { addBufferMinutes: Number(event.target.value) } })}>
                  {bufferOptions.map((value) => <option key={value} value={value}>{value} min</option>)}
                </select>
              </label>
              <label>
                <span>{t.count}</span>
                <select value={settings.generatedSlotCount} onChange={(event) => updateSettings({ generatedSlotCount: Number(event.target.value) })}>
                  {countOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="check">
                <input type="checkbox" checked={settings.avoidWeekendsAndHolidays} onChange={(event) => updateSettings({ avoidWeekendsAndHolidays: event.target.checked })} />
                <span>{t.avoidHolidays}</span>
              </label>
            </div>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <h2>{t.candidateTimes}</h2>
              <button className="secondaryButton compact" onClick={randomGenerate}>{t.randomGenerate}</button>
            </div>
            <div className="slotList">
              {slots.map((slot) => (
                <article className="slotCard candidate" key={slot.id}>
                  <span>{formatSlots([slot], settings.language)}</span>
                  <button className="ghostIcon" onClick={() => removeSlot(slot.id)} aria-label={t.remove}>
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="sectionTitle">
              <Plus size={18} />
              <h2>{t.addCandidate}</h2>
            </div>
            <div className="grid two">
              <label>
                <span>{t.date}</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
              </label>
              <label>
                <span>{t.time}</span>
                <input type="time" step="1800" value={draft.time} onChange={(event) => setDraft({ ...draft, time: normalizeHalfHour(event.target.value) })} />
              </label>
            </div>
            <button className="secondaryButton" onClick={addDraftSlot}>{t.addCandidate}</button>
          </section>

          <section className="panel">
            <div className="sectionHeader">
              <h2>{t.reply}</h2>
              <div className="actions">
                <button className="ghostIcon" onClick={copyResponse} aria-label={t.copy}><Copy size={16} /></button>
                <button className="ghostIcon" onClick={shareResponse} aria-label={t.share}><Share2 size={16} /></button>
              </div>
            </div>
            <div className="languageRow">
              {languages.map(([value, label]) => (
                <label key={value}>
                  <input type="checkbox" checked={outputLanguages.includes(value)} onChange={(event) => toggleLanguage(value, event.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
            <textarea value={responseText} readOnly rows={8} />
          </section>

          <section className="panel">
            <h2>{t.placeholders}</h2>
            <div className="grid">
              <input value={placeholderForm.title} onChange={(event) => setPlaceholderForm({ ...placeholderForm, title: event.target.value })} placeholder={t.title} />
              <textarea value={placeholderForm.description} onChange={(event) => setPlaceholderForm({ ...placeholderForm, description: event.target.value })} placeholder={t.details} rows={3} />
              <button className="primaryButton" disabled={!slots.length || !placeholderForm.title.trim()} onClick={createLocalPlaceholders}>{t.createPlaceholders}</button>
            </div>
            <div className="slotList">
              {placeholders.map((event) => (
                <article className="slotCard pending" key={event.id}>
                  <span>{event.title} · {formatSlots([event], settings.language)}</span>
                  <div className="actions">
                    <button className="secondaryButton compact" onClick={() => confirmPlaceholder(event)}>{t.confirm}</button>
                    <button className="ghostIcon" onClick={() => deletePlaceholderBatch(event)} aria-label={t.delete}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="panel settingsPanel">
          <div className="sectionHeader">
            <h2>{t.settings}</h2>
            <button className="secondaryButton compact" onClick={() => setActivePage('plan')}>{t.back}</button>
          </div>
          <div className="grid">
            <label>
              <span>{t.webLanguage}</span>
              <select value={settings.language} onChange={(event) => updateSettings({ language: event.target.value })}>
                {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="accountPanel">
            <h3>{t.accounts}</h3>
            <div className="accountRow">
              <span>{t.localSession}</span>
              <strong>{t.active}</strong>
            </div>
            {webAccounts.length ? webAccounts.map((account) => (
              <div className="accountRow accountRowStack" key={account.id}>
                <span>
                  <b>{account.email}</b>
                  <small>{account.eventCount ?? 0} {t.googleCalendar}</small>
                </span>
                <div className="actions">
                  <strong>{account.status === 'reconnect-required' ? t.reconnectRequired : t.connected}</strong>
                  <button className="ghostTextButton" onClick={() => disconnectWebGoogleAccount(account.id)}>{t.disconnect}</button>
                </div>
              </div>
            )) : (
              <div className="accountRow">
                <span>{t.googleCalendar}</span>
                <strong>{t.notConnected}</strong>
              </div>
            )}
            <div className="accountActions">
              <button className="primaryButton" disabled={accountLoading === 'connect'} onClick={connectWebGoogleAccount}>
                {accountLoading === 'connect' ? t.connecting : (webAccounts.length ? t.addGoogleAccount : t.connectGoogle)}
              </button>
              <button className="secondaryButton" disabled={!webAccounts.length || accountLoading === 'refresh'} onClick={refreshWebGoogleCalendars}>
                {accountLoading === 'refresh' ? t.refreshing : t.refreshCalendars}
              </button>
            </div>
            <p>{googleClientConfigured ? t.connectSoon : t.missingClientId}</p>
          </div>
        </section>
      )}

      <nav className="bottomNav" aria-label="Main navigation">
        <button className={activePage === 'plan' ? 'active' : ''} onClick={() => setActivePage('plan')}>
          <CalendarDays size={17} />
          {t.plan}
        </button>
        <button className={activePage === 'settings' ? 'active' : ''} onClick={() => setActivePage('settings')}>
          <Settings size={17} />
          {t.settings}
        </button>
      </nav>

      {notice ? <p className="toast">{notice}</p> : null}
    </main>
  );
}

function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${key}`);
    return raw ? JSON.parse(raw) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}:${key}`, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function buildSlots(settings, busyEvents, placeholders) {
  return generateAvailability({
    busyEvents: [...busyEvents, ...placeholders],
    pendingEvents: [],
    settings
  });
}

function getDefaultDraft() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (date.getMinutes() === 0) {
    date.setHours(date.getHours() + 1);
  }
  return {
    date: date.toISOString().slice(0, 10),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildMonthDays(monthDate) {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth()
    };
  });
}

function isSameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function dateToInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonthTitle(date, language = 'en') {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(date);
}

function formatDayTitle(date, language = 'en') {
  return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', weekday: 'short' }).format(date);
}

function localDateTimeToIso(date, time) {
  return new Date(`${date}T${normalizeHalfHour(time)}:00`).toISOString();
}

function normalizeHalfHour(value) {
  const [hour, minute] = value.split(':').map(Number);
  const normalizedMinute = minute < 30 ? 0 : 30;
  return `${String(hour || 0).padStart(2, '0')}:${String(normalizedMinute).padStart(2, '0')}`;
}

function hasOverlap(slot, events) {
  return events.some((event) => new Date(slot.start) < new Date(event.end) && new Date(event.start) < new Date(slot.end));
}

function slotToCandidateEvent(slot) {
  return {
    ...slot,
    provider: 'local',
    title: 'Candidate',
    status: 'candidate'
  };
}

function upsertAccount(accounts, nextAccount) {
  const exists = accounts.some((account) => account.id === nextAccount.id);
  if (!exists) {
    return [...accounts, { ...nextAccount, status: 'connected' }];
  }
  return accounts.map((account) => (
    account.id === nextAccount.id ? { ...account, ...nextAccount, status: 'connected' } : account
  ));
}

function mergeGoogleEvents(currentEvents, accountId, googleEvents) {
  return dedupeCalendarEvents([
    ...currentEvents.filter((event) => event.sourceAccountId !== accountId),
    ...googleEvents
  ]);
}

function mergeAllGoogleEvents(currentEvents, googleEvents) {
  return dedupeCalendarEvents([
    ...currentEvents.filter((event) => event.provider !== 'google'),
    ...googleEvents
  ]);
}

function dedupeCalendarEvents(events) {
  const byKey = new Map();
  const localEvents = [];

  for (const event of events) {
    const key = calendarEventIdentity(event);
    if (!key) {
      localEvents.push(event);
      continue;
    }

    const existing = byKey.get(key);
    if (!existing || isNewerGoogleEvent(event, existing)) {
      byKey.set(key, event);
    }
  }

  return [...localEvents, ...byKey.values()].sort(byStart);
}

function calendarEventIdentity(event) {
  const googleEventId = event.details?.googleEventId;
  if (!googleEventId) {
    return '';
  }
  return `${event.sourceAccountId || event.provider}:${googleEventId}`;
}

function isNewerGoogleEvent(nextEvent, currentEvent) {
  const nextUpdated = Date.parse(nextEvent.details?.updated || '');
  const currentUpdated = Date.parse(currentEvent.details?.updated || '');
  if (Number.isFinite(nextUpdated) && Number.isFinite(currentUpdated)) {
    return nextUpdated >= currentUpdated;
  }
  if (nextEvent.details?.isAllDay !== currentEvent.details?.isAllDay) {
    return !nextEvent.details?.isAllDay;
  }
  return true;
}

function byStart(a, b) {
  return new Date(a.start) - new Date(b.start);
}

createRoot(document.querySelector('#root')).render(<App />);
