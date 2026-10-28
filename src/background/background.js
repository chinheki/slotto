// MV3 background worker for context-menu capture, configurable event reminders,
// and delayed reminder tests delivered as notifications and mascot bubbles.
import { parseSelectedTimeText } from '../services/parser.js';
import { saveSelectedDraft } from '../adapters/chromeStorage.js';

const MENU_ID = 'add-interview-schedule';
const REMINDER_PREFIX = 'slotto-event-reminder:';
const TEST_REMINDER_PREFIX = 'slotto-test-reminder:';
const REMINDER_PAYLOADS_KEY = 'eventReminderPayloads';
const NOTIFICATION_TARGETS_KEY = 'reminderNotificationTargets';
const REMINDER_LEAD_MINUTES = 30;
const deliveringReminders = new Set();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Add Interview Schedule',
    contexts: ['selection'],
    documentUrlPatterns: [
      'https://mail.google.com/*',
      'https://www.linkedin.com/*',
      'https://www.bizreach.jp/*',
      'https://www.green-japan.com/*'
    ]
  });
  scheduleEventReminders();
});

chrome.runtime.onStartup.addListener(() => scheduleEventReminders());

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.busyEvents) {
    scheduleEventReminders(changes.busyEvents.newValue ?? []);
  }
  if (areaName === 'sync' && changes.settings) {
    scheduleEventReminders();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(REMINDER_PREFIX) && !alarm.name.startsWith(TEST_REMINDER_PREFIX)) {
    return;
  }
  await fireScheduledReminder(alarm.name);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'TEST_EVENT_REMINDER') {
    return false;
  }
  scheduleTestReminder(message.title || 'Slotto test')
    .then(() => sendResponse({ ok: true, delaySeconds: 10 }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function scheduleTestReminder(title) {
  const now = Date.now();
  const alarmName = `${TEST_REMINDER_PREFIX}${now}`;
  const data = await chrome.storage.local.get([REMINDER_PAYLOADS_KEY]);
  await chrome.storage.local.set({
    [REMINDER_PAYLOADS_KEY]: {
      ...(data[REMINDER_PAYLOADS_KEY] ?? {}),
      [alarmName]: {
        id: `test-${now}`,
        title,
        start: new Date(now + 30 * 60 * 1000).toISOString(),
        meetingUrl: '',
        calendarUrl: ''
      }
    }
  });
  chrome.alarms.create(alarmName, { when: now + 10 * 1000 });
  setTimeout(async () => {
    await chrome.alarms.clear(alarmName);
    await fireScheduledReminder(alarmName);
  }, 10 * 1000);
}

async function fireScheduledReminder(alarmName) {
  if (deliveringReminders.has(alarmName)) {
    return;
  }
  deliveringReminders.add(alarmName);
  try {
    const data = await chrome.storage.local.get([REMINDER_PAYLOADS_KEY]);
    const payload = data[REMINDER_PAYLOADS_KEY]?.[alarmName];
    if (!payload) {
      return;
    }
    const remainingPayloads = { ...(data[REMINDER_PAYLOADS_KEY] ?? {}) };
    delete remainingPayloads[alarmName];
    await chrome.storage.local.set({ [REMINDER_PAYLOADS_KEY]: remainingPayloads });
    await deliverReminder(payload);
  } finally {
    deliveringReminders.delete(alarmName);
  }
}

async function deliverReminder(payload) {
  const data = await chrome.storage.local.get([NOTIFICATION_TARGETS_KEY]);
  const settingsData = await chrome.storage.sync.get(['settings']);
  const language = settingsData.settings?.language ?? 'ja';
  const reminder = buildReminderCopy(payload, language);
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (activeTab?.id) {
    try {
      await chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_EVENT_REMINDER', payload: reminder });
    } catch (_error) {
      // System notification below remains available when the page cannot host content scripts.
    }
  }

  const notificationId = `slotto-${payload.id}`;
  await createSystemNotification(notificationId, reminder);
  await chrome.storage.local.set({
    [NOTIFICATION_TARGETS_KEY]: {
      ...(data[NOTIFICATION_TARGETS_KEY] ?? {}),
      [notificationId]: payload.meetingUrl || payload.calendarUrl || ''
    }
  });
}

async function createSystemNotification(notificationId, reminder) {
  const options = {
    type: 'basic',
    title: 'Slotto',
    message: `${reminder.message}\n${reminder.timeLabel}`,
    priority: 2
  };
  const iconUrls = [
    chrome.runtime.getURL('assets/reminders/character-128.png'),
    chrome.runtime.getURL('assets/icons/icon-128.png')
  ];

  let lastError;
  for (const iconUrl of iconUrls) {
    try {
      await chrome.notifications.create(notificationId, { ...options, iconUrl });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  console.error('Unable to create Slotto system notification.', lastError);
}

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const data = await chrome.storage.local.get([NOTIFICATION_TARGETS_KEY]);
  const target = data[NOTIFICATION_TARGETS_KEY]?.[notificationId];
  if (target) {
    await chrome.tabs.create({ url: target });
  }
  chrome.notifications.clear(notificationId);
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID) {
    return;
  }

  const parsed = parseSelectedTimeText(info.selectionText ?? '');
  await saveSelectedDraft({
    rawText: info.selectionText ?? '',
    parsed,
    capturedAt: new Date().toISOString()
  });

  if (chrome.action.openPopup) {
    await chrome.action.openPopup();
  }
});

async function scheduleEventReminders(events) {
  const busyEvents = events ?? (await chrome.storage.local.get(['busyEvents'])).busyEvents ?? [];
  const settings = (await chrome.storage.sync.get(['settings'])).settings ?? {};
  const storedPayloads = (await chrome.storage.local.get([REMINDER_PAYLOADS_KEY]))[REMINDER_PAYLOADS_KEY] ?? {};
  const pendingTestPayloads = Object.fromEntries(
    Object.entries(storedPayloads).filter(([name]) => name.startsWith(TEST_REMINDER_PREFIX))
  );
  const existingAlarms = await chrome.alarms.getAll();
  await Promise.all(existingAlarms
    .filter((alarm) => alarm.name.startsWith(REMINDER_PREFIX))
    .map((alarm) => chrome.alarms.clear(alarm.name)));

  if (settings.remindersEnabled === false) {
    await chrome.storage.local.set({ [REMINDER_PAYLOADS_KEY]: pendingTestPayloads });
    return;
  }

  const now = Date.now();
  const leadMinutes = Number(settings.reminderLeadMinutes ?? REMINDER_LEAD_MINUTES);
  const payloads = {};
  for (const event of busyEvents) {
    if (event.details?.isAllDay || event.status === 'cancelled') {
      continue;
    }
    const startAt = Date.parse(event.start);
    if (!Number.isFinite(startAt) || startAt <= now) {
      continue;
    }
    const alarmName = `${REMINDER_PREFIX}${encodeURIComponent(event.id)}`;
    const reminderAt = Math.max(now + 1000, startAt - leadMinutes * 60 * 1000);
    payloads[alarmName] = {
      id: event.id,
      title: event.title || '(No title)',
      start: event.start,
      meetingUrl: event.details?.hangoutLink || event.details?.conferenceLinks?.[0]?.uri || '',
      calendarUrl: event.details?.htmlLink || ''
    };
    chrome.alarms.create(alarmName, { when: reminderAt });
  }

  await chrome.storage.local.set({
    [REMINDER_PAYLOADS_KEY]: { ...pendingTestPayloads, ...payloads }
  });
}

function buildReminderCopy(payload, language) {
  const locale = language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'ja-JP';
  const timeLabel = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(payload.start));
  const messages = {
    en: `${payload.title} is coming up!`,
    ja: `もうすぐ「${payload.title}」だよ`,
    zh: `马上就是「${payload.title}」咯`
  };
  const closeLabels = {
    en: 'Close reminder',
    ja: 'リマインダーを閉じる',
    zh: '关闭提醒'
  };
  return {
    ...payload,
    message: messages[language] ?? messages.ja,
    closeLabel: closeLabels[language] ?? closeLabels.ja,
    timeLabel
  };
}
