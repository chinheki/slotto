import { parseSelectedTimeText } from '../services/parser.js';
import { saveSelectedDraft } from '../adapters/chromeStorage.js';

const MENU_ID = 'add-interview-schedule';

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
