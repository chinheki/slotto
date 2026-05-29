import { defaultSettings, sampleBusyEvents } from '../services/defaults.js';
import { expirePendingEvents } from '../services/pending.js';

const KEYS = {
  settings: 'settings',
  busyEvents: 'busyEvents',
  pendingEvents: 'pendingEvents',
  selectedDraft: 'selectedDraft',
  connectedAccounts: 'connectedAccounts',
  storageOwnerAccount: 'storageOwnerAccount',
  calendarAuthorizations: 'calendarAuthorizations'
};

const SYNC_KEYS = [
  KEYS.settings,
  KEYS.pendingEvents,
  KEYS.connectedAccounts,
  KEYS.storageOwnerAccount
];

const LOCAL_KEYS = [
  KEYS.busyEvents,
  KEYS.selectedDraft,
  KEYS.calendarAuthorizations
];

export async function getAppState() {
  const [syncedData, localData, primaryAccount] = await Promise.all([
    storageGet('sync', SYNC_KEYS),
    storageGet('local', LOCAL_KEYS),
    getPrimaryChromeAccount()
  ]);
  const settings = mergeSettings(syncedData.settings);
  const pendingEvents = expirePendingEvents(syncedData.pendingEvents ?? [], settings.pendingExpirationHours);
  const storageOwnerAccount = await ensureStorageOwner(syncedData.storageOwnerAccount, primaryAccount);
  const calendarAuthorizations = localData.calendarAuthorizations ?? {};

  if ((syncedData.pendingEvents ?? []).length !== pendingEvents.length) {
    await storageSet('sync', { [KEYS.pendingEvents]: pendingEvents });
  }

  const connectedAccounts = (syncedData.connectedAccounts ?? []).map((account) => ({
    ...account,
    authorizationStatus: calendarAuthorizations[account.id]?.authorizedAt ? 'authorized' : 'reconnect-required'
  }));

  return {
    settings,
    busyEvents: localData.busyEvents ?? (primaryAccount ? [] : sampleBusyEvents),
    pendingEvents,
    selectedDraft: localData.selectedDraft ?? null,
    connectedAccounts,
    primaryAccount,
    storageOwnerAccount,
    syncStatus: getSyncStatus(storageOwnerAccount, primaryAccount)
  };
}

export async function saveSettings(settings) {
  await storageSet('sync', { [KEYS.settings]: mergeSettings(settings) });
}

export async function savePendingEvents(pendingEvents) {
  await storageSet('sync', { [KEYS.pendingEvents]: pendingEvents });
}

export async function saveBusyEvents(busyEvents) {
  await storageSet('local', { [KEYS.busyEvents]: busyEvents });
}

export async function saveConnectedAccounts(connectedAccounts) {
  const syncedAccounts = connectedAccounts.map(({ authorizationStatus, ...account }) => account);
  await storageSet('sync', { [KEYS.connectedAccounts]: syncedAccounts });
}

export async function saveCalendarAuthorization(accountId, authorization = {}) {
  const data = await storageGet('local', [KEYS.calendarAuthorizations]);
  await storageSet('local', {
    [KEYS.calendarAuthorizations]: {
      ...(data.calendarAuthorizations ?? {}),
      [accountId]: {
        ...(data.calendarAuthorizations?.[accountId] ?? {}),
        ...authorization,
        authorizedAt: new Date().toISOString()
      }
    }
  });
}

export async function getCalendarAuthorization(accountId) {
  const data = await storageGet('local', [KEYS.calendarAuthorizations]);
  return data.calendarAuthorizations?.[accountId] ?? null;
}

export async function removeCalendarAuthorization(accountId) {
  const data = await storageGet('local', [KEYS.calendarAuthorizations]);
  const nextAuthorizations = { ...(data.calendarAuthorizations ?? {}) };
  delete nextAuthorizations[accountId];
  await storageSet('local', { [KEYS.calendarAuthorizations]: nextAuthorizations });
}

export async function saveSelectedDraft(selectedDraft) {
  await storageSet('local', { [KEYS.selectedDraft]: selectedDraft });
}

export async function clearSelectedDraft() {
  await storageRemove('local', KEYS.selectedDraft);
}

export async function clearLocalCalendarData() {
  await Promise.all([
    storageRemove('local', KEYS.busyEvents),
    storageRemove('local', KEYS.selectedDraft),
    storageRemove('local', KEYS.calendarAuthorizations)
  ]);
}

function mergeSettings(settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    calendars: {
      ...defaultSettings.calendars,
      ...(settings.calendars ?? {})
    },
    rules: {
      ...defaultSettings.rules,
      ...(settings.rules ?? {})
    }
  };
}

async function ensureStorageOwner(existingOwner, primaryAccount) {
  if (existingOwner || !primaryAccount?.email) {
    return existingOwner ?? null;
  }

  const owner = {
    id: primaryAccount.id,
    email: primaryAccount.email,
    createdAt: new Date().toISOString()
  };
  await storageSet('sync', { [KEYS.storageOwnerAccount]: owner });
  return owner;
}

async function getPrimaryChromeAccount() {
  if (!hasChromeIdentity()) {
    return null;
  }

  try {
    const info = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
    if (!info?.email) {
      return null;
    }
    return {
      id: info.id || info.email,
      email: info.email
    };
  } catch (_error) {
    return null;
  }
}

function getSyncStatus(storageOwnerAccount, primaryAccount) {
  if (!primaryAccount?.email) {
    return 'no-primary-account';
  }

  if (!storageOwnerAccount?.email) {
    return 'initializing';
  }

  return storageOwnerAccount.email === primaryAccount.email ? 'active' : 'account-mismatch';
}

async function storageGet(area, keys) {
  if (hasChromeStorage(area)) {
    return chrome.storage[area].get(keys);
  }

  return keys.reduce((data, key) => {
    const raw = localStorage.getItem(`slotto:${area}:${key}`);
    data[key] = raw ? JSON.parse(raw) : undefined;
    return data;
  }, {});
}

async function storageSet(area, values) {
  if (hasChromeStorage(area)) {
    return chrome.storage[area].set(values);
  }

  Object.entries(values).forEach(([key, value]) => {
    localStorage.setItem(`slotto:${area}:${key}`, JSON.stringify(value));
  });
}

async function storageRemove(area, key) {
  if (hasChromeStorage(area)) {
    return chrome.storage[area].remove(key);
  }

  localStorage.removeItem(`slotto:${area}:${key}`);
}

function hasChromeStorage(area) {
  return typeof chrome !== 'undefined' && chrome.storage?.[area];
}

function hasChromeIdentity() {
  return typeof chrome !== 'undefined' && chrome.identity?.getProfileUserInfo;
}
