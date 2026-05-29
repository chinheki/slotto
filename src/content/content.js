chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'INSERT_TEXT') {
    return false;
  }

  const target = document.activeElement;
  if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    target.value = `${target.value.slice(0, start)}${message.text}${target.value.slice(end)}`;
    target.dispatchEvent(new Event('input', { bubbles: true }));
    sendResponse({ ok: true });
    return true;
  }

  const editable = target?.closest?.('[contenteditable="true"]');
  if (editable) {
    document.execCommand('insertText', false, message.text);
    sendResponse({ ok: true });
    return true;
  }

  sendResponse({ ok: false, reason: 'No editable field is focused.' });
  return true;
});
